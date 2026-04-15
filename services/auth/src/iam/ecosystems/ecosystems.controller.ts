import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';

@Controller('ecosystems')
export class EcosystemsController {
  constructor(private readonly ecosystemsService: EcosystemsService) {}

  @Post()
  create(@Body() createEcosystemDto: CreateEcosystemDto) {
    // TODO: añadir @UseGuards(RolesGuard) y @Roles(Role.USER) cuando activemos JWTs.
    return this.ecosystemsService.create(createEcosystemDto);
  }

  @Get()
  findAll() {
    return this.ecosystemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ecosystemsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEcosystemDto: UpdateEcosystemDto) {
    return this.ecosystemsService.update(id, updateEcosystemDto);
  }

  @Patch(':id/heartbeat')
  updateHeartbeat(@Param('id') id: string) {
    return this.ecosystemsService.updateHeartbeat(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ecosystemsService.remove(id);
  }
}
