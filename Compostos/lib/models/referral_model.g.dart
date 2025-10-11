// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ReferralLevelAdapter extends TypeAdapter<ReferralLevel> {
  @override
  final int typeId = 1;

  @override
  ReferralLevel read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return ReferralLevel.firstLevel;
      case 1:
        return ReferralLevel.secondLevel;
      default:
        return ReferralLevel.firstLevel;
    }
  }

  @override
  void write(BinaryWriter writer, ReferralLevel obj) {
    switch (obj) {
      case ReferralLevel.firstLevel:
        writer.writeByte(0);
        break;
      case ReferralLevel.secondLevel:
        writer.writeByte(1);
        break;
    }
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
