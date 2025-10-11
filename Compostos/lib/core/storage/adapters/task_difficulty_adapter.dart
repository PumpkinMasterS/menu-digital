import 'package:hive/hive.dart';
import 'package:compostos/models/task_model.dart';

class TaskDifficultyAdapter extends TypeAdapter<TaskDifficulty> {
  @override
  final int typeId = 4;

  @override
  TaskDifficulty read(BinaryReader reader) {
    final index = reader.readByte();
    return TaskDifficulty.values[index];
  }

  @override
  void write(BinaryWriter writer, TaskDifficulty obj) {
    writer.writeByte(obj.index);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskDifficultyAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}