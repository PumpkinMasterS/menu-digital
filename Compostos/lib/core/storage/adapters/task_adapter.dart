import 'package:hive/hive.dart';
import 'package:compostos/models/task_model.dart';

class TaskAdapter extends TypeAdapter<TaskModel> {
  @override
  final int typeId = 6;

  @override
  TaskModel read(BinaryReader reader) {
    final map = reader.readMap().map((key, value) => MapEntry(key as String, value));
    return TaskModel.fromMap(Map<String, dynamic>.from(map));
  }

  @override
  void write(BinaryWriter writer, TaskModel obj) {
    writer.writeMap(obj.toMap());
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}