/// Postgres `bigint` columns (fare_paisa, amount_paisa, ...) are serialized
/// as JSON strings by TypeORM/pg, not numbers — unlike every other numeric
/// column, to avoid JS number precision loss. `as int?` on that value throws;
/// use this wherever a field is documented as `bigint` in its TypeORM entity.
int? parseBigintField(Object? value) => switch (value) {
      null => null,
      final int v => v,
      final String v => int.parse(v),
      final Object v => v as int,
    };
