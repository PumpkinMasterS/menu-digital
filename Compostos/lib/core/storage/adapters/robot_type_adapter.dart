import 'package:hive/hive.dart';
import 'package:compostos/models/robot_model.dart';

class RobotTypeAdapter extends TypeAdapter<RobotType> {
  @override
  final int typeId = 9;

  @override
  RobotType read(BinaryReader reader) {
    return RobotType.values[reader.readByte()];
  }

  @override
  void write(BinaryWriter writer, RobotType obj) {
    writer.writeByte(obj.index);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RobotTypeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}