module.exports = grammar({
  name: 'ankilang',

  rules: {
    source: $ => repeat($._text_or_anki_block),

    _text_or_anki_block: $ => choice(
      $.text,
      $.anki_block,
    ),

    anki_block: $ => seq(
      $.anki_start_tag,
      $.anki_block_body,
      $.anki_end_tag,
    ),


    anki_start_tag: $ => /\?anki/,
    anki_end_tag: $ => /\?endanki/,

    _seperator: $ => "?",
    anki_block_body: $ => seq(
      field("metadata", $.anki_block_metadata),
      repeat1(seq($._seperator, $.anki_block_note_field))
    ),
    anki_block_metadata: $ => $.text,

    note_field_name: $ => "Front",
    _note_field_name_separator: $ => ":",
    anki_block_note_field: $ => choice(
      seq(field("note_field_name", $.note_field_name), $._note_field_name_separator, $.text),
      $.text,
    ),

    text: $ => repeat1(choice(
      token(prec(-1, /\?/)),
      (/[^\s\?][^\?]*/),
    )),

    name: $ => /[_a-zA-Z\u00A1-\u00ff][_a-zA-Z\u00A1-\u00ff\d]*/,

  },

  word: $ => $.name,


  conflicts: $ => [
    [$.text]
  ],
});
