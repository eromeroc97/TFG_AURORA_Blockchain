import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesService } from './devices.service';

/**
 * Controlador de gestión de dispositivos (IAM).
 * Expone endpoints para CRUD de dispositivos Zero-Trust.
 *
 * @Controller('devices') - Prefijo de ruta: /devices
 */
@ApiTags('Devices (IAM)')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Endpoint para registrar un nuevo dispositivo.
   *
   * @param createDeviceDto - Datos del dispositivo
   * @returns El dispositivo creado
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo dispositivo Zero-Trust' })
  @ApiCreatedResponse({ description: 'Dispositivo creado correctamente.' })
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  /**
   * Endpoint para listar todos los dispositivos.
   *
   * @returns Lista de dispositivos
   */
  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  /**
   * Endpoint para obtener un dispositivo por ID.
   *
   * @param id - ID del dispositivo
   * @returns El dispositivo
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  /**
   * Endpoint para actualizar un dispositivo.
   *
   * @param id - ID del dispositivo
   * @param updateDeviceDto - Datos a actualizar
   * @returns El dispositivo actualizado
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  /**
   * Endpoint para eliminar un dispositivo.
   *
   * @param id - ID del dispositivo
   * @returns El dispositivo eliminado
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}