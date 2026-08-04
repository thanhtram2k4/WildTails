import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('passes through valid data', () => {
    const result = pipe.transform({ name: 'Alice', age: 25 });
    expect(result).toEqual({ name: 'Alice', age: 25 });
  });

  it('strips unknown fields (Zod default)', () => {
    const result = pipe.transform({ name: 'Bob', age: 30, extra: 'ignored' }) as {
      name: string;
      age: number;
      extra?: string;
    };
    expect(result).not.toHaveProperty('extra');
  });

  it('throws BadRequestException on missing required field', () => {
    expect(() => pipe.transform({ name: 'Alice' })).toThrow(BadRequestException);
  });

  it('throws BadRequestException on wrong type', () => {
    expect(() => pipe.transform({ name: 'Alice', age: 'not-a-number' })).toThrow(
      BadRequestException,
    );
  });

  it('error payload has code VALIDATION_ERROR and details array', () => {
    try {
      pipe.transform({});
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(BadRequestException);
      const exception = err as BadRequestException;
      const response = exception.getResponse() as {
        code: string;
        message: string;
        details: unknown[];
      };
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.details)).toBe(true);
      expect((response.details as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('throws on null input', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });
});
