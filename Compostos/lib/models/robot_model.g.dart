// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'robot_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class RobotModelAdapter extends TypeAdapter<RobotModel> {
  @override
  final int typeId = 3;

  @override
  RobotModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return RobotModel(
      id: fields[0] as String,
      name: fields[1] as String,
      level: fields[2] as RobotLevel,
      initialInvestment: fields[3] as double,
      dailyReturnRate: fields[4] as double,
      processingPower: fields[8] as int,
      energyConsumption: fields[9] as double,
      maintenanceFee: fields[10] as double,
      isActive: fields[11] as bool,
      purchaseDate: fields[5] as DateTime?,
    )
      ..currentValue = fields[6] as double
      ..lastCollectionDate = fields[7] as DateTime;
  }

  @override
  void write(BinaryWriter writer, RobotModel obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.level)
      ..writeByte(3)
      ..write(obj.initialInvestment)
      ..writeByte(4)
      ..write(obj.dailyReturnRate)
      ..writeByte(5)
      ..write(obj.purchaseDate)
      ..writeByte(6)
      ..write(obj.currentValue)
      ..writeByte(7)
      ..write(obj.lastCollectionDate)
      ..writeByte(8)
      ..write(obj.processingPower)
      ..writeByte(9)
      ..write(obj.energyConsumption)
      ..writeByte(10)
      ..write(obj.maintenanceFee)
      ..writeByte(11)
      ..write(obj.isActive);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RobotModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class RobotLevelAdapter extends TypeAdapter<RobotLevel> {
  @override
  final int typeId = 2;

  @override
  RobotLevel read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return RobotLevel.S;
      case 1:
        return RobotLevel.A;
      case 2:
        return RobotLevel.B;
      default:
        return RobotLevel.S;
    }
  }

  @override
  void write(BinaryWriter writer, RobotLevel obj) {
    switch (obj) {
      case RobotLevel.S:
        writer.writeByte(0);
        break;
      case RobotLevel.A:
        writer.writeByte(1);
        break;
      case RobotLevel.B:
        writer.writeByte(2);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RobotLevelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
