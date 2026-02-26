import { AuditContextService } from '../audit-context.service';
import { PrismaService } from '../prisma.service';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockAuditLogCreate = jest.fn().mockResolvedValue(undefined);
const mockPoolEnd = jest.fn().mockResolvedValue(undefined);

const mockPrismaClientInstance = {
  $connect: mockConnect,
  $disconnect: mockDisconnect,
  $extends: jest.fn(),
  category: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  product: { deleteMany: jest.fn() },
  auditLog: { create: mockAuditLogCreate },
};

mockPrismaClientInstance.$extends.mockReturnValue(mockPrismaClientInstance);

jest.mock(
  '@prisma/client',
  () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClientInstance),
  }),
  { virtual: true },
);

jest.mock(
  '@prisma/adapter-pg',
  () => ({
    PrismaPg: jest.fn().mockImplementation((pool) => ({ pool })),
  }),
  { virtual: true },
);

jest.mock(
  'pg',
  () => ({
    Pool: jest.fn().mockImplementation(() => ({
      end: mockPoolEnd,
    })),
  }),
  { virtual: true },
);

describe('PrismaService', () => {
  const auditContextService: AuditContextService = {
    run: jest.fn(),
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as AuditContextService;

  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pass@db:5432/miniloja';
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('should throw when DATABASE_URL is not defined', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService(auditContextService)).toThrow(
      'DATABASE_URL is required to initialize PrismaService',
    );
  });

  it('should connect on module init', async () => {
    const service = new PrismaService(auditContextService);
    await service.onModuleInit();

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should disconnect and end pool only once when shutdown hooks are called', async () => {
    const service = new PrismaService(auditContextService);

    await service.onModuleDestroy();
    await service.onApplicationShutdown();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  it('should expose delegates through getters', () => {
    const service = new PrismaService(auditContextService);

    expect(service.category).toBe(mockPrismaClientInstance.category);
    expect(service.product).toBe(mockPrismaClientInstance.product);
    expect(service.auditLog).toBe(mockPrismaClientInstance.auditLog);
  });
});
