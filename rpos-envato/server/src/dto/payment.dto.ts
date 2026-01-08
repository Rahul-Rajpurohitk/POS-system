import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsArray, ValidateNested, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, RefundReason, TaxType } from '../types/enums';

/**
 * DTO for processing a single payment
 */
export class ProcessPaymentDTO {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amountTendered!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  cardLastFour?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for a single payment in split payment
 */
export class SplitPaymentItemDTO {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  cardLastFour?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  giftCardCode?: string;
}

/**
 * DTO for processing split payment
 */
export class ProcessSplitPaymentDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentItemDTO)
  payments!: SplitPaymentItemDTO[];
}

/**
 * DTO for refunded item
 */
export class RefundedItemDTO {
  @IsUUID()
  orderItemId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  amount!: number;
}

/**
 * DTO for processing a refund
 */
export class ProcessRefundDTO {
  @IsEnum(RefundReason)
  reason!: RefundReason;

  @IsOptional()
  @IsString()
  reasonNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundedItemDTO)
  refundedItems?: RefundedItemDTO[];

  @IsOptional()
  @IsBoolean()
  restoreInventory?: boolean;
}

/**
 * DTO for calculating order totals
 */
export class CalculateTotalsDTO {
  @IsNumber()
  @Min(0)
  subTotal!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsEnum(TaxType)
  taxType!: TaxType;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;
}

/**
 * DTO for voiding a payment
 */
export class VoidPaymentDTO {
  @IsOptional()
  @IsString()
  reason?: string;
}
