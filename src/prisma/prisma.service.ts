import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

// Contrato mínimo do Prisma Client que esta aplicação utiliza.
// Mantemos este tipo enxuto para reduzir acoplamento com detalhes internos.
type PrismaClientLike = {
  // Abre conexão com o banco.
  $connect: () => Promise<void>;
  // Fecha conexão com o banco.
  $disconnect: () => Promise<void>;
  // Delegate do model Category.
  category: any;
  // Delegate do model Product.
  product: any;
  // Delegate do model AuditLog.
  auditLog: any;
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

  constructor() {
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
    // Inicializa o Prisma Client com o adapter baseado no pool.
    this.prismaClient = new PrismaClient({
      adapter: new PrismaPg(this.pool),
    });
  }

  // Exposição do delegate Category para uso em repositories/services.
  get category() {
    return this.prismaClient.category;
  }

  // Exposição do delegate Product para uso em repositories/services.
  get product() {
    return this.prismaClient.product;
  }

  // Exposição do delegate AuditLog para uso em repositories/services.
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
}
