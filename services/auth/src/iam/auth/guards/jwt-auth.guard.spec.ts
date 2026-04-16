import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('delegates canActivate to passport AuthGuard implementation', () => {
    const guard = new JwtAuthGuard();
    const parentPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const superSpy = jest.spyOn(parentPrototype, 'canActivate').mockReturnValue(true as any);
    const context = {} as ExecutionContext;

    const result = guard.canActivate(context);

    expect(superSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });
});
