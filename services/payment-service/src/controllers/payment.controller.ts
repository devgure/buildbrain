import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto, UpdatePaymentDto } from '@buildbrainos/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }

  @Post(':id/process')
  @UseGuards(JwtAuthGuard)
  processPayment(@Param('id') id: string) {
    return this.paymentService.processPayment(id);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Param('id') id: string) {
    return this.paymentService.verifyPayment(id);
  }
}
