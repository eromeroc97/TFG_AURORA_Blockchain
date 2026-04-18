import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from './global-exception.filter';

describe('AllExceptionsFilter', () => {
  const createHost = (request: Partial<Request>, response: Partial<Response>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  };

  it('returns a sanitized internal error response for unknown exceptions', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const setHeader = jest.fn();

    const request = {
      method: 'GET',
      url: '/iam/users',
      headers: {},
    } as Partial<Request>;

    const response = {
      status,
      json,
      setHeader,
    } as Partial<Response>;

    const filter = new AllExceptionsFilter();
    filter.catch(new Error('sensitive-db-stack'), createHost(request, response));

    expect(status).toHaveBeenCalledWith(500);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Se ha producido un error interno. Intentalo de nuevo mas tarde.',
      }),
    );
  });

  it('preserves controlled HttpException messages for expected 4xx errors', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const setHeader = jest.fn();

    const request = {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      requestId: 'request-123',
    } as Partial<Request>;

    const response = {
      status,
      json,
      setHeader,
    } as Partial<Response>;

    const filter = new AllExceptionsFilter();
    filter.catch(new BadRequestException('Credenciales invalidas.'), createHost(request, response));

    expect(status).toHaveBeenCalledWith(400);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-123');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: 'BAD_REQUEST',
        message: 'Credenciales invalidas.',
        requestId: 'request-123',
        path: '/auth/login',
      }),
    );
  });

  it('maps Prisma known errors to sanitized domain responses', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const setHeader = jest.fn();

    const request = {
      method: 'POST',
      url: '/iam/users',
      headers: { 'x-request-id': 'trace-prisma-1' },
    } as Partial<Request>;

    const response = {
      status,
      json,
      setHeader,
    } as Partial<Response>;

    const prismaError = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    };

    const filter = new AllExceptionsFilter();
    filter.catch(prismaError, createHost(request, response));

    expect(status).toHaveBeenCalledWith(409);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'trace-prisma-1');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        errorCode: 'CONFLICT',
        message: 'Ya existe un recurso con los mismos datos.',
      }),
    );
  });
});
