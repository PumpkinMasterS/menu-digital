import 'package:hive/hive.dart';
import 'package:compostos/models/referral_model.dart';

class ReferralRewardAdapter extends TypeAdapter<ReferralReward> {
  @override
  final int typeId = 7;

  @override
  ReferralReward read(BinaryReader reader) {
    return ReferralReward.fromMap(Map<String, dynamic>.from(reader.readMap()));
  }

  @override
  void write(BinaryWriter writer, ReferralReward obj) {
    writer.writeMap(obj.toMap());
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralRewardAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}