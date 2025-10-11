import 'package:hive/hive.dart';
import 'package:compostos/models/robot_model.dart';

class RobotAdapter extends TypeAdapter<RobotModel> {
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
      level: RobotLevel.values[fields[2] as int],
      initialInvestment: fields[3] as double,
      dailyReturnRate: fields[4] as double,
      processingPower: fields[5] as int,
      energyConsumption: fields[6] as double,
      maintenanceFee: fields[7] as double,
      purchaseDate: DateTime.fromMillisecondsSinceEpoch(fields[8] as int),
    )
      ..currentValue = fields[9] as double
      ..lastCollectionDate = DateTime.fromMillisecondsSinceEpoch(fields[10] as int);
  }

  @override
  void write(BinaryWriter writer, RobotModel obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.level.index)
      ..writeByte(3)
      ..write(obj.initialInvestment)
      ..writeByte(4)
      ..write(obj.dailyReturnRate)
      ..writeByte(5)
      ..write(obj.processingPower)
      ..writeByte(6)
      ..write(obj.energyConsumption)
      ..writeByte(7)
      ..write(obj.maintenanceFee)
      ..writeByte(8)
      ..write(obj.purchaseDate.millisecondsSinceEpoch)
      ..writeByte(9)
      ..write(obj.currentValue)
      ..writeByte(10)
      ..write(obj.lastCollectionDate.millisecondsSinceEpoch);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RobotAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}