import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuditContextService } from './audit-context.service';

// Acoes persistidas na tabela AuditLog.
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

// Contrato mínimo do Prisma Client que esta aplicação utiliza.
// Mantemos este tipo enxuto para reduzir acoplamento com detalhes internos.
type PrismaClientLike = {
  // Abre conexão com o banco.
  $connect: () => Promise<void>;
  // Fecha conexão com o banco.
  $disconnect: () => Promise<void>;
  // Permite estender o client com hooks globais de query.
  $extends: (extension: unknown) => PrismaClientLike;
  // Delegate do model Category.
  category: any;
  // Delegate do model Product.
  product: any;
  // Delegate do model AuditLog.
  auditLog: any;
  // Acesso dinamico a delegates para auditoria multi-model.
  [delegate: string]: any;
};

// Operacoes de mutacao que devem gerar trilha de auditoria.
type MutationOperation =
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'delete'
  | 'deleteMany';

// Shape do payload recebido pelo hook de query extension.
type QueryExtensionParams = {
  model?: string;
  operation: string;
  args?: Record<string, any>;
  query: (args?: Record<string, any>) => Promise<unknown>;
};

// Contrato mínimo do pool de conexões PostgreSQL.
type PoolLike = {
  // Encerra o pool de conexões.
  end: () => Promise<void>;
};

@Injectable()
export class PrismaService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  // Instância principal do Prisma Client usada pelos módulos da aplicação.
  private readonly prismaClient: PrismaClientLike;
  // Pool do driver PostgreSQL usado pelo adapter Prisma.
  private readonly pool: PoolLike;
  // Promessa de fechamento compartilhada para evitar dupla desconexão.
  private shutdownPromise?: Promise<void>;

  constructor(private readonly auditContextService: AuditContextService) {
    // Lê a string de conexão do ambiente.
    const connectionString = process.env.DATABASE_URL;

    // Falha cedo caso a variável obrigatória não exista.
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize PrismaService');
    }

    // Carregamento dinâmico para evitar erro em cenários de teste local
    // quando dependências Prisma não estão instaladas no host.
    const { PrismaClient } = require('@prisma/client') as {
      PrismaClient: new (options: { adapter: unknown }) => PrismaClientLike;
    };
    // Adapter oficial do Prisma para driver postgres (Prisma 7+).
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (pool: PoolLike) => unknown;
    };
    // Driver postgres responsável pelo gerenciamento do pool.
    const { Pool } = require('pg') as {
      Pool: new (options: { connectionString: string }) => PoolLike;
    };

    // Inicializa o pool com a conexão configurada.
    this.pool = new Pool({ connectionString });

    // Cria o client base e acopla extensao de auditoria global.
    const rawClient = new PrismaClient({
      adapter: new PrismaPg(this.pool),
    });
    this.prismaClient = this.attachAuditLogExtension(rawClient);
  }

  // Exposição do delegate Category para uso em repositories/services.
  get category() {
    return this.prismaClient.category;
  }

  // Exposição do delegate Product para uso em repositories/services.
  get product() {
    return this.prismaClient.product;
  }

  // Exposição do delegate AuditLog para consultas especificas.
  get auditLog() {
    return this.prismaClient.auditLog;
  }

  // Hook do Nest executado na inicialização do módulo.
  // Garante conexão pronta antes de atender requisições.
  async onModuleInit(): Promise<void> {
    await this.prismaClient.$connect();
  }

  // Executa fechamento seguro e idempotente das conexões.
  private async shutdownConnections(): Promise<void> {
    if (!this.shutdownPromise) {
      this.shutdownPromise = (async () => {
        await this.prismaClient.$disconnect();
        await this.pool.end();
      })();
    }

    await this.shutdownPromise;
  }

  // Hook do Nest executado na finalização do módulo.
  // Fecha cliente Prisma e também o pool do driver.
  async onModuleDestroy(): Promise<void> {
    await this.shutdownConnections();
  }

  // Hook global de encerramento da aplicação (SIGINT/SIGTERM).
  // Reaproveita o mesmo fluxo para evitar chamadas duplicadas.
  async onApplicationShutdown(_signal?: string): Promise<void> {
    await this.shutdownConnections();
  }

  // Injeta uma extensao no Prisma para auditar mutacoes em todos os models.
  // A propria tabela AuditLog e excluida para evitar recursao infinita.
  private attachAuditLogExtension(
    rawClient: PrismaClientLike,
  ): PrismaClientLike {
    const mutationOperations: ReadonlySet<MutationOperation> = new Set([
      'create',
      'createMany',
      'update',
      'updateMany',
      'upsert',
      'delete',
      'deleteMany',
    ]);

    return rawClient.$extends({
      query: {
        $allModels: {
          $allOperations: async (params: QueryExtensionParams) => {
            const { model, operation, args, query } = params;

            if (
              !model ||
              model === 'AuditLog' ||
              !mutationOperations.has(operation as MutationOperation)
            ) {
              return query(args);
            }

            // Captura estado anterior (quando aplicavel), executa mutacao
            // e registra o evento no AuditLog.
            const oldValues = await this.loadOldValues(
              rawClient,
              model,
              operation,
              args,
            );
            const result = await query(args);
            const action = this.resolveAction(
              operation as MutationOperation,
              oldValues,
            );

            await this.createAuditLog(rawClient, {
              action,
              entity: model,
              operation,
              args,
              oldValues,
              result,
            });

            return result;
          },
        },
      },
    });
  }

  // Obtem snapshot anterior em operacoes que sobrescrevem/removem dados.
  private async loadOldValues(
    client: PrismaClientLike,
    model: string,
    operation: string,
    args?: Record<string, any>,
  ): Promise<unknown> {
    if (!['update', 'delete', 'upsert'].includes(operation)) {
      return null;
    }

    const where = args?.where;
    if (!where || typeof where !== 'object') {
      return null;
    }

    const delegateName = this.toDelegateName(model);
    const delegate = client[delegateName];

    if (!delegate?.findUnique) {
      return null;
    }

    try {
      return await delegate.findUnique({ where });
    } catch {
      return null;
    }
  }

  // Mapeia operacao Prisma para acao de auditoria.
  private resolveAction(
    operation: MutationOperation,
    oldValues: unknown,
  ): AuditAction {
    if (operation === 'create' || operation === 'createMany') {
      return 'CREATE';
    }

    if (operation === 'delete' || operation === 'deleteMany') {
      return 'DELETE';
    }

    if (operation === 'upsert' && !oldValues) {
      return 'CREATE';
    }

    return 'UPDATE';
  }

  // Persiste um registro de auditoria contendo contexto da request
  // e os dados antes/depois da alteracao.
  private async createAuditLog(
    client: PrismaClientLike,
    payload: {
      action: AuditAction;
      entity: string;
      operation: string;
      args?: Record<string, any>;
      oldValues: unknown;
      result: unknown;
    },
  ): Promise<void> {
    const { action, entity, operation, args, oldValues, result } = payload;
    const context = this.auditContextService.get();
    const entityId = this.extractEntityId(operation, args, result);

    const isDelete = action === 'DELETE';
    const newValues = isDelete ? null : result;

    await client.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        oldValues: this.normalizeForJson(oldValues),
        newValues: this.normalizeForJson(newValues),
        changedFields: this.resolveChangedFields(operation, args, oldValues),
        actorId: context?.actorId ?? null,
        actorType: context?.actorType ?? null,
        requestId: context?.requestId ?? null,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: this.normalizeForJson(context?.metadata ?? null),
      },
    });
  }

  // Determina os campos alterados para facilitar rastreabilidade.
  private resolveChangedFields(
    operation: string,
    args?: Record<string, any>,
    oldValues?: unknown,
  ): string[] {
    if (operation === 'create') {
      return this.toObjectKeys(args?.data);
    }

    if (operation === 'update') {
      return this.toObjectKeys(args?.data);
    }

    if (operation === 'upsert') {
      const createFields = this.toObjectKeys(args?.create);
      const updateFields = this.toObjectKeys(args?.update);
      return Array.from(new Set([...createFields, ...updateFields]));
    }

    if (operation === 'delete') {
      return this.toObjectKeys(oldValues);
    }

    if (operation.endsWith('Many')) {
      return ['*'];
    }

    return [];
  }

  // Resolve o identificador principal do registro alterado.
  // Em operacoes em lote, retorna um marcador com a contagem.
  private extractEntityId(
    operation: string,
    args: Record<string, any> | undefined,
    result: unknown,
  ): string {
    const fromResult = this.readId(result);
    if (fromResult) {
      return fromResult;
    }

    const fromWhere = this.readId(args?.where);
    if (fromWhere) {
      return fromWhere;
    }

    if (operation.endsWith('Many')) {
      const count = this.readCount(result);
      return count !== null ? `bulk:${count}` : 'bulk';
    }

    return 'unknown';
  }

  // Extrai `id` de objetos retornados pelo Prisma.
  private readId(input: unknown): string | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return null;
    }

    const id = (input as Record<string, unknown>).id;
    if (
      typeof id === 'string' ||
      typeof id === 'number' ||
      typeof id === 'bigint'
    ) {
      return String(id);
    }

    return null;
  }

  // Extrai `count` de respostas de operacoes em lote.
  private readCount(input: unknown): number | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return null;
    }

    const count = (input as Record<string, unknown>).count;
    return typeof count === 'number' ? count : null;
  }

  // Converte objeto em lista de chaves de primeiro nivel.
  private toObjectKeys(input: unknown): string[] {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return [];
    }

    return Object.keys(input);
  }

  // Converte nome do model Prisma para nome do delegate (ex: Category -> category).
  private toDelegateName(model: string): string {
    return `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
  }

  // Normaliza payload para JSON valido no banco (inclui suporte a bigint).
  private normalizeForJson(input: unknown): unknown {
    if (input === undefined) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(input, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
