#include <tree_sitter/parser.h>

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 24
#define LARGE_STATE_COUNT 2
#define SYMBOL_COUNT 19
#define ALIAS_COUNT 0
#define TOKEN_COUNT 9
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 2
#define MAX_ALIAS_SEQUENCE_LENGTH 3
#define PRODUCTION_ID_COUNT 3

enum {
  sym_name = 1,
  sym_anki_start_tag = 2,
  sym_anki_end_tag = 3,
  sym__seperator = 4,
  sym_note_field_name = 5,
  sym__note_field_name_separator = 6,
  aux_sym_text_token1 = 7,
  aux_sym_text_token2 = 8,
  sym_source = 9,
  sym__text_or_anki_block = 10,
  sym_anki_block = 11,
  sym_anki_block_body = 12,
  sym_anki_block_metadata = 13,
  sym_anki_block_note_field = 14,
  sym_text = 15,
  aux_sym_source_repeat1 = 16,
  aux_sym_anki_block_body_repeat1 = 17,
  aux_sym_text_repeat1 = 18,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [sym_name] = "name",
  [sym_anki_start_tag] = "anki_start_tag",
  [sym_anki_end_tag] = "anki_end_tag",
  [sym__seperator] = "_seperator",
  [sym_note_field_name] = "note_field_name",
  [sym__note_field_name_separator] = "_note_field_name_separator",
  [aux_sym_text_token1] = "text_token1",
  [aux_sym_text_token2] = "text_token2",
  [sym_source] = "source",
  [sym__text_or_anki_block] = "_text_or_anki_block",
  [sym_anki_block] = "anki_block",
  [sym_anki_block_body] = "anki_block_body",
  [sym_anki_block_metadata] = "anki_block_metadata",
  [sym_anki_block_note_field] = "anki_block_note_field",
  [sym_text] = "text",
  [aux_sym_source_repeat1] = "source_repeat1",
  [aux_sym_anki_block_body_repeat1] = "anki_block_body_repeat1",
  [aux_sym_text_repeat1] = "text_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [sym_name] = sym_name,
  [sym_anki_start_tag] = sym_anki_start_tag,
  [sym_anki_end_tag] = sym_anki_end_tag,
  [sym__seperator] = sym__seperator,
  [sym_note_field_name] = sym_note_field_name,
  [sym__note_field_name_separator] = sym__note_field_name_separator,
  [aux_sym_text_token1] = aux_sym_text_token1,
  [aux_sym_text_token2] = aux_sym_text_token2,
  [sym_source] = sym_source,
  [sym__text_or_anki_block] = sym__text_or_anki_block,
  [sym_anki_block] = sym_anki_block,
  [sym_anki_block_body] = sym_anki_block_body,
  [sym_anki_block_metadata] = sym_anki_block_metadata,
  [sym_anki_block_note_field] = sym_anki_block_note_field,
  [sym_text] = sym_text,
  [aux_sym_source_repeat1] = aux_sym_source_repeat1,
  [aux_sym_anki_block_body_repeat1] = aux_sym_anki_block_body_repeat1,
  [aux_sym_text_repeat1] = aux_sym_text_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [sym_name] = {
    .visible = true,
    .named = true,
  },
  [sym_anki_start_tag] = {
    .visible = true,
    .named = true,
  },
  [sym_anki_end_tag] = {
    .visible = true,
    .named = true,
  },
  [sym__seperator] = {
    .visible = false,
    .named = true,
  },
  [sym_note_field_name] = {
    .visible = true,
    .named = true,
  },
  [sym__note_field_name_separator] = {
    .visible = false,
    .named = true,
  },
  [aux_sym_text_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_text_token2] = {
    .visible = false,
    .named = false,
  },
  [sym_source] = {
    .visible = true,
    .named = true,
  },
  [sym__text_or_anki_block] = {
    .visible = false,
    .named = true,
  },
  [sym_anki_block] = {
    .visible = true,
    .named = true,
  },
  [sym_anki_block_body] = {
    .visible = true,
    .named = true,
  },
  [sym_anki_block_metadata] = {
    .visible = true,
    .named = true,
  },
  [sym_anki_block_note_field] = {
    .visible = true,
    .named = true,
  },
  [sym_text] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_source_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_anki_block_body_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_text_repeat1] = {
    .visible = false,
    .named = false,
  },
};

enum {
  field_metadata = 1,
  field_note_field_name = 2,
};

static const char * const ts_field_names[] = {
  [0] = NULL,
  [field_metadata] = "metadata",
  [field_note_field_name] = "note_field_name",
};

static const TSFieldMapSlice ts_field_map_slices[PRODUCTION_ID_COUNT] = {
  [1] = {.index = 0, .length = 1},
  [2] = {.index = 1, .length = 1},
};

static const TSFieldMapEntry ts_field_map_entries[] = {
  [0] =
    {field_metadata, 0},
  [1] =
    {field_note_field_name, 0},
};

static const TSSymbol ts_alias_sequences[PRODUCTION_ID_COUNT][MAX_ALIAS_SEQUENCE_LENGTH] = {
  [0] = {0},
};

static const uint16_t ts_non_terminal_alias_map[] = {
  0,
};

static const TSStateId ts_primary_state_ids[STATE_COUNT] = {
  [0] = 0,
  [1] = 1,
  [2] = 2,
  [3] = 3,
  [4] = 4,
  [5] = 5,
  [6] = 6,
  [7] = 6,
  [8] = 8,
  [9] = 8,
  [10] = 10,
  [11] = 11,
  [12] = 8,
  [13] = 6,
  [14] = 14,
  [15] = 15,
  [16] = 16,
  [17] = 17,
  [18] = 18,
  [19] = 19,
  [20] = 20,
  [21] = 21,
  [22] = 22,
  [23] = 23,
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(15);
      if (lookahead == ':') ADVANCE(22);
      if (lookahead == '?') ADVANCE(19);
      if (lookahead == 'F') ADVANCE(32);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(0)
      if (('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 1:
      if (lookahead == '?') ADVANCE(19);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(1)
      if (lookahead != 0) ADVANCE(29);
      END_STATE();
    case 2:
      if (lookahead == '?') ADVANCE(23);
      if (lookahead == 'F') ADVANCE(27);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(2)
      if (lookahead != 0) ADVANCE(29);
      END_STATE();
    case 3:
      if (lookahead == '?') ADVANCE(23);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(3)
      if (lookahead != 0) ADVANCE(29);
      END_STATE();
    case 4:
      if (lookahead == '?') ADVANCE(18);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(4)
      if (lookahead != 0) ADVANCE(29);
      END_STATE();
    case 5:
      if (lookahead == 'a') ADVANCE(12);
      END_STATE();
    case 6:
      if (lookahead == 'd') ADVANCE(5);
      END_STATE();
    case 7:
      if (lookahead == 'i') ADVANCE(17);
      END_STATE();
    case 8:
      if (lookahead == 'i') ADVANCE(16);
      END_STATE();
    case 9:
      if (lookahead == 'k') ADVANCE(7);
      END_STATE();
    case 10:
      if (lookahead == 'k') ADVANCE(8);
      END_STATE();
    case 11:
      if (lookahead == 'n') ADVANCE(6);
      END_STATE();
    case 12:
      if (lookahead == 'n') ADVANCE(9);
      END_STATE();
    case 13:
      if (lookahead == 'n') ADVANCE(10);
      END_STATE();
    case 14:
      if (eof) ADVANCE(15);
      if (lookahead == '?') ADVANCE(24);
      if (lookahead == '\t' ||
          lookahead == '\n' ||
          lookahead == '\r' ||
          lookahead == ' ') SKIP(14)
      if (lookahead != 0) ADVANCE(29);
      END_STATE();
    case 15:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 16:
      ACCEPT_TOKEN(sym_anki_start_tag);
      END_STATE();
    case 17:
      ACCEPT_TOKEN(sym_anki_end_tag);
      END_STATE();
    case 18:
      ACCEPT_TOKEN(sym__seperator);
      END_STATE();
    case 19:
      ACCEPT_TOKEN(sym__seperator);
      if (lookahead == 'e') ADVANCE(11);
      END_STATE();
    case 20:
      ACCEPT_TOKEN(sym_note_field_name);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 21:
      ACCEPT_TOKEN(sym_note_field_name);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 22:
      ACCEPT_TOKEN(sym__note_field_name_separator);
      END_STATE();
    case 23:
      ACCEPT_TOKEN(aux_sym_text_token1);
      END_STATE();
    case 24:
      ACCEPT_TOKEN(aux_sym_text_token1);
      if (lookahead == 'a') ADVANCE(13);
      END_STATE();
    case 25:
      ACCEPT_TOKEN(aux_sym_text_token2);
      if (lookahead == 'n') ADVANCE(28);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 26:
      ACCEPT_TOKEN(aux_sym_text_token2);
      if (lookahead == 'o') ADVANCE(25);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 27:
      ACCEPT_TOKEN(aux_sym_text_token2);
      if (lookahead == 'r') ADVANCE(26);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 28:
      ACCEPT_TOKEN(aux_sym_text_token2);
      if (lookahead == 't') ADVANCE(21);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 29:
      ACCEPT_TOKEN(aux_sym_text_token2);
      if (lookahead != 0 &&
          lookahead != '?') ADVANCE(29);
      END_STATE();
    case 30:
      ACCEPT_TOKEN(sym_name);
      if (lookahead == 'n') ADVANCE(33);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 31:
      ACCEPT_TOKEN(sym_name);
      if (lookahead == 'o') ADVANCE(30);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 32:
      ACCEPT_TOKEN(sym_name);
      if (lookahead == 'r') ADVANCE(31);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 33:
      ACCEPT_TOKEN(sym_name);
      if (lookahead == 't') ADVANCE(20);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    case 34:
      ACCEPT_TOKEN(sym_name);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z') ||
          (161 <= lookahead && lookahead <= 255)) ADVANCE(34);
      END_STATE();
    default:
      return false;
  }
}

static bool ts_lex_keywords(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    default:
      return false;
  }
}

static const TSLexMode ts_lex_modes[STATE_COUNT] = {
  [0] = {.lex_state = 0},
  [1] = {.lex_state = 14},
  [2] = {.lex_state = 14},
  [3] = {.lex_state = 14},
  [4] = {.lex_state = 3},
  [5] = {.lex_state = 2},
  [6] = {.lex_state = 14},
  [7] = {.lex_state = 1},
  [8] = {.lex_state = 14},
  [9] = {.lex_state = 1},
  [10] = {.lex_state = 3},
  [11] = {.lex_state = 14},
  [12] = {.lex_state = 4},
  [13] = {.lex_state = 4},
  [14] = {.lex_state = 0},
  [15] = {.lex_state = 0},
  [16] = {.lex_state = 0},
  [17] = {.lex_state = 0},
  [18] = {.lex_state = 0},
  [19] = {.lex_state = 4},
  [20] = {.lex_state = 4},
  [21] = {.lex_state = 0},
  [22] = {.lex_state = 0},
  [23] = {.lex_state = 0},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [sym_name] = ACTIONS(1),
    [sym_anki_end_tag] = ACTIONS(1),
    [sym__seperator] = ACTIONS(1),
    [sym_note_field_name] = ACTIONS(1),
    [sym__note_field_name_separator] = ACTIONS(1),
    [aux_sym_text_token1] = ACTIONS(1),
  },
  [1] = {
    [sym_source] = STATE(22),
    [sym__text_or_anki_block] = STATE(2),
    [sym_anki_block] = STATE(2),
    [sym_text] = STATE(2),
    [aux_sym_source_repeat1] = STATE(2),
    [aux_sym_text_repeat1] = STATE(8),
    [ts_builtin_sym_end] = ACTIONS(3),
    [sym_anki_start_tag] = ACTIONS(5),
    [aux_sym_text_token1] = ACTIONS(7),
    [aux_sym_text_token2] = ACTIONS(9),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 6,
    ACTIONS(5), 1,
      sym_anki_start_tag,
    ACTIONS(7), 1,
      aux_sym_text_token1,
    ACTIONS(9), 1,
      aux_sym_text_token2,
    ACTIONS(11), 1,
      ts_builtin_sym_end,
    STATE(8), 1,
      aux_sym_text_repeat1,
    STATE(3), 4,
      sym__text_or_anki_block,
      sym_anki_block,
      sym_text,
      aux_sym_source_repeat1,
  [22] = 6,
    ACTIONS(13), 1,
      ts_builtin_sym_end,
    ACTIONS(15), 1,
      sym_anki_start_tag,
    ACTIONS(18), 1,
      aux_sym_text_token1,
    ACTIONS(21), 1,
      aux_sym_text_token2,
    STATE(8), 1,
      aux_sym_text_repeat1,
    STATE(3), 4,
      sym__text_or_anki_block,
      sym_anki_block,
      sym_text,
      aux_sym_source_repeat1,
  [44] = 5,
    STATE(12), 1,
      aux_sym_text_repeat1,
    STATE(19), 1,
      sym_anki_block_metadata,
    STATE(20), 1,
      sym_text,
    STATE(23), 1,
      sym_anki_block_body,
    ACTIONS(24), 2,
      aux_sym_text_token1,
      aux_sym_text_token2,
  [61] = 6,
    ACTIONS(26), 1,
      sym_note_field_name,
    ACTIONS(28), 1,
      aux_sym_text_token1,
    ACTIONS(30), 1,
      aux_sym_text_token2,
    STATE(9), 1,
      aux_sym_text_repeat1,
    STATE(16), 1,
      sym_anki_block_note_field,
    STATE(17), 1,
      sym_text,
  [80] = 4,
    ACTIONS(34), 1,
      aux_sym_text_token1,
    ACTIONS(37), 1,
      aux_sym_text_token2,
    STATE(6), 1,
      aux_sym_text_repeat1,
    ACTIONS(32), 2,
      ts_builtin_sym_end,
      sym_anki_start_tag,
  [94] = 5,
    ACTIONS(32), 1,
      sym_anki_end_tag,
    ACTIONS(40), 1,
      sym__seperator,
    ACTIONS(42), 1,
      aux_sym_text_token1,
    ACTIONS(45), 1,
      aux_sym_text_token2,
    STATE(7), 1,
      aux_sym_text_repeat1,
  [110] = 4,
    ACTIONS(50), 1,
      aux_sym_text_token1,
    ACTIONS(53), 1,
      aux_sym_text_token2,
    STATE(6), 1,
      aux_sym_text_repeat1,
    ACTIONS(48), 2,
      ts_builtin_sym_end,
      sym_anki_start_tag,
  [124] = 5,
    ACTIONS(48), 1,
      sym_anki_end_tag,
    ACTIONS(56), 1,
      sym__seperator,
    ACTIONS(58), 1,
      aux_sym_text_token1,
    ACTIONS(60), 1,
      aux_sym_text_token2,
    STATE(7), 1,
      aux_sym_text_repeat1,
  [140] = 3,
    STATE(9), 1,
      aux_sym_text_repeat1,
    STATE(18), 1,
      sym_text,
    ACTIONS(28), 2,
      aux_sym_text_token1,
      aux_sym_text_token2,
  [151] = 2,
    ACTIONS(64), 1,
      aux_sym_text_token1,
    ACTIONS(62), 3,
      ts_builtin_sym_end,
      sym_anki_start_tag,
      aux_sym_text_token2,
  [160] = 4,
    ACTIONS(48), 1,
      sym__seperator,
    ACTIONS(66), 1,
      aux_sym_text_token1,
    ACTIONS(68), 1,
      aux_sym_text_token2,
    STATE(13), 1,
      aux_sym_text_repeat1,
  [173] = 4,
    ACTIONS(32), 1,
      sym__seperator,
    ACTIONS(70), 1,
      aux_sym_text_token1,
    ACTIONS(73), 1,
      aux_sym_text_token2,
    STATE(13), 1,
      aux_sym_text_repeat1,
  [186] = 3,
    ACTIONS(76), 1,
      sym_anki_end_tag,
    ACTIONS(78), 1,
      sym__seperator,
    STATE(15), 1,
      aux_sym_anki_block_body_repeat1,
  [196] = 3,
    ACTIONS(80), 1,
      sym_anki_end_tag,
    ACTIONS(82), 1,
      sym__seperator,
    STATE(15), 1,
      aux_sym_anki_block_body_repeat1,
  [206] = 2,
    ACTIONS(80), 1,
      sym_anki_end_tag,
    ACTIONS(85), 1,
      sym__seperator,
  [213] = 2,
    ACTIONS(87), 1,
      sym_anki_end_tag,
    ACTIONS(89), 1,
      sym__seperator,
  [220] = 2,
    ACTIONS(91), 1,
      sym_anki_end_tag,
    ACTIONS(93), 1,
      sym__seperator,
  [227] = 2,
    ACTIONS(95), 1,
      sym__seperator,
    STATE(14), 1,
      aux_sym_anki_block_body_repeat1,
  [234] = 1,
    ACTIONS(97), 1,
      sym__seperator,
  [238] = 1,
    ACTIONS(99), 1,
      sym__note_field_name_separator,
  [242] = 1,
    ACTIONS(101), 1,
      ts_builtin_sym_end,
  [246] = 1,
    ACTIONS(103), 1,
      sym_anki_end_tag,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(2)] = 0,
  [SMALL_STATE(3)] = 22,
  [SMALL_STATE(4)] = 44,
  [SMALL_STATE(5)] = 61,
  [SMALL_STATE(6)] = 80,
  [SMALL_STATE(7)] = 94,
  [SMALL_STATE(8)] = 110,
  [SMALL_STATE(9)] = 124,
  [SMALL_STATE(10)] = 140,
  [SMALL_STATE(11)] = 151,
  [SMALL_STATE(12)] = 160,
  [SMALL_STATE(13)] = 173,
  [SMALL_STATE(14)] = 186,
  [SMALL_STATE(15)] = 196,
  [SMALL_STATE(16)] = 206,
  [SMALL_STATE(17)] = 213,
  [SMALL_STATE(18)] = 220,
  [SMALL_STATE(19)] = 227,
  [SMALL_STATE(20)] = 234,
  [SMALL_STATE(21)] = 238,
  [SMALL_STATE(22)] = 242,
  [SMALL_STATE(23)] = 246,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source, 0),
  [5] = {.entry = {.count = 1, .reusable = true}}, SHIFT(4),
  [7] = {.entry = {.count = 1, .reusable = false}}, SHIFT(8),
  [9] = {.entry = {.count = 1, .reusable = true}}, SHIFT(8),
  [11] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source, 1),
  [13] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_source_repeat1, 2),
  [15] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_repeat1, 2), SHIFT_REPEAT(4),
  [18] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_source_repeat1, 2), SHIFT_REPEAT(8),
  [21] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_repeat1, 2), SHIFT_REPEAT(8),
  [24] = {.entry = {.count = 1, .reusable = true}}, SHIFT(12),
  [26] = {.entry = {.count = 1, .reusable = false}}, SHIFT(21),
  [28] = {.entry = {.count = 1, .reusable = true}}, SHIFT(9),
  [30] = {.entry = {.count = 1, .reusable = false}}, SHIFT(9),
  [32] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_text_repeat1, 2),
  [34] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(6),
  [37] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(6),
  [40] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_text_repeat1, 2),
  [42] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(7),
  [45] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(7),
  [48] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_text, 1),
  [50] = {.entry = {.count = 2, .reusable = false}}, REDUCE(sym_text, 1), SHIFT(6),
  [53] = {.entry = {.count = 2, .reusable = true}}, REDUCE(sym_text, 1), SHIFT(6),
  [56] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_text, 1),
  [58] = {.entry = {.count = 1, .reusable = false}}, SHIFT(7),
  [60] = {.entry = {.count = 1, .reusable = true}}, SHIFT(7),
  [62] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_anki_block, 3),
  [64] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_anki_block, 3),
  [66] = {.entry = {.count = 1, .reusable = false}}, SHIFT(13),
  [68] = {.entry = {.count = 1, .reusable = true}}, SHIFT(13),
  [70] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(13),
  [73] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_text_repeat1, 2), SHIFT_REPEAT(13),
  [76] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_anki_block_body, 2, .production_id = 1),
  [78] = {.entry = {.count = 1, .reusable = false}}, SHIFT(5),
  [80] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_anki_block_body_repeat1, 2),
  [82] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_anki_block_body_repeat1, 2), SHIFT_REPEAT(5),
  [85] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_anki_block_body_repeat1, 2),
  [87] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_anki_block_note_field, 1),
  [89] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_anki_block_note_field, 1),
  [91] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_anki_block_note_field, 3, .production_id = 2),
  [93] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_anki_block_note_field, 3, .production_id = 2),
  [95] = {.entry = {.count = 1, .reusable = true}}, SHIFT(5),
  [97] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_anki_block_metadata, 1),
  [99] = {.entry = {.count = 1, .reusable = true}}, SHIFT(10),
  [101] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
  [103] = {.entry = {.count = 1, .reusable = true}}, SHIFT(11),
};

#ifdef __cplusplus
extern "C" {
#endif
#ifdef _WIN32
#define extern __declspec(dllexport)
#endif

extern const TSLanguage *tree_sitter_ankilang(void) {
  static const TSLanguage language = {
    .version = LANGUAGE_VERSION,
    .symbol_count = SYMBOL_COUNT,
    .alias_count = ALIAS_COUNT,
    .token_count = TOKEN_COUNT,
    .external_token_count = EXTERNAL_TOKEN_COUNT,
    .state_count = STATE_COUNT,
    .large_state_count = LARGE_STATE_COUNT,
    .production_id_count = PRODUCTION_ID_COUNT,
    .field_count = FIELD_COUNT,
    .max_alias_sequence_length = MAX_ALIAS_SEQUENCE_LENGTH,
    .parse_table = &ts_parse_table[0][0],
    .small_parse_table = ts_small_parse_table,
    .small_parse_table_map = ts_small_parse_table_map,
    .parse_actions = ts_parse_actions,
    .symbol_names = ts_symbol_names,
    .field_names = ts_field_names,
    .field_map_slices = ts_field_map_slices,
    .field_map_entries = ts_field_map_entries,
    .symbol_metadata = ts_symbol_metadata,
    .public_symbol_map = ts_symbol_map,
    .alias_map = ts_non_terminal_alias_map,
    .alias_sequences = &ts_alias_sequences[0][0],
    .lex_modes = ts_lex_modes,
    .lex_fn = ts_lex,
    .keyword_lex_fn = ts_lex_keywords,
    .keyword_capture_token = sym_name,
    .primary_state_ids = ts_primary_state_ids,
  };
  return &language;
}
#ifdef __cplusplus
}
#endif
