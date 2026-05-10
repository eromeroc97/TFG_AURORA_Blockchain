import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterChaincodeDto } from './register-chaincode.dto';

describe('RegisterChaincodeDto', () => {
  const validDto = {
    apiName: 'my-api',
    channel: 'my-channel',
    chaincodeName: 'my-chaincode',
    ffiJson: '{"name":"TestFFI"}',
  };

  describe('validation', () => {
    it('should pass validation with all required fields', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, validDto);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with exact minimum valid data', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        apiName: 'a',
        channel: 'b',
        chaincodeName: 'c',
        ffiJson: 'x',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when apiName is missing', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        channel: 'my-channel',
        chaincodeName: 'my-chaincode',
        ffiJson: '{}',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('apiName');
    });

    it('should fail validation when apiName is empty string', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        ...validDto,
        apiName: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'apiName')).toBe(true);
    });

    it('should fail validation when channel is missing', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        apiName: 'my-api',
        chaincodeName: 'my-chaincode',
        ffiJson: '{}',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channel');
    });

    it('should fail validation when chaincodeName is missing', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        apiName: 'my-api',
        channel: 'my-channel',
        ffiJson: '{}',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('chaincodeName');
    });

    it('should fail validation when ffiJson is missing', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        apiName: 'my-api',
        channel: 'my-channel',
        chaincodeName: 'my-chaincode',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('ffiJson');
    });

    it('should fail validation when ffiJson is empty string', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        ...validDto,
        ffiJson: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'ffiJson')).toBe(true);
    });

    it('should fail validation when apiName is not a string', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        ...validDto,
        apiName: 123,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('apiName');
    });

    it('should fail validation when ffiJson is not a string', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        ...validDto,
        ffiJson: { name: 'test' },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('ffiJson');
    });

    it('should collect all validation errors', async () => {
      const dto = plainToInstance(RegisterChaincodeDto, {
        apiName: '',
        channel: '',
        chaincodeName: '',
        ffiJson: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});