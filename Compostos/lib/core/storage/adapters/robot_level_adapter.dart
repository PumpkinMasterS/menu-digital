import 'package:hive/hive.dart';
import 'package:compostos/models/robot_model.dart';

class RobotLevelAdapter extends TypeAdapter<RobotLevel> {
  @override
  final int typeId = 2;

  @override
  RobotLevel read(BinaryReader reader) {
    final index = reader.readByte();
    return RobotLevel.values[index];
  }

  @override
  void write(BinaryWriter writer, RobotLevel obj) {
    writer.writeByte(obj.index);
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