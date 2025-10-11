import 'package:hive/hive.dart';
import 'package:compostos/models/referral_model.dart';

class ReferralLevelAdapter extends TypeAdapter<ReferralLevel> {
  @override
  final int typeId = 8;

  @override
  ReferralLevel read(BinaryReader reader) {
    final index = reader.readByte();
    return ReferralLevel.values[index];
  }

  @override
  void write(BinaryWriter writer, ReferralLevel obj) {
    writer.writeByte(obj.index);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralLevelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}