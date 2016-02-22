const PREC = {
  AND: -1,
  OR: -1,
  NOT: 5,
  DEFINED: 10,
  ASSIGN: 15,
  CONDITIONAL: 20,
  RANGE: 25,
  BOOLEAN_OR: 30,
  BOOLEAN_AND: 35,
  RELATIONAL: 40,
  COMPARISON: 45,
  BITWISE_OR: 50,
  BITWISE_AND: 55,
  SHIFT: 60,
  ADDITIVE: 65,
  MULTIPLICATIVE: 70,
  UNARY_MINUS: 75,
  EXPONENTIAL: 80,
  COMPLEMENT: 85,
  LITERAL: 100,
};

const unbalancedDelimiters = '!@#$%^&*)]}>|\\=/+-~`\'",.?:;_'.split('');
const identifierPattern = /[a-zA-Z_][a-zA-Z0-9_]*/;
const operators = ['..', '|', '^', '&', '<=>', '==', '===', '=~', '>', '>=', '<', '<=', '+', '-', '*', '/', '%', '**', '<<', '>>', '~', '+@', '-@', '[]', '[]='];

module.exports = grammar({
  name: 'ruby',

  extras: $ => [
    $.comment,
    $._line_break,
    /[ \t\r]/
  ],

  rules: {
    program: $ => seq(sep($._statement, $._terminator), optional(seq('\n__END__', $.uninterpreted))),
    uninterpreted: $ => (/.*/),

    _statement: $ => choice(
      $._declaration,
      // seq($._call, "do", optional("|", commaSep($._block_variable), "|"), sep($._statement, $._terminator), "end"),
      seq("undef", $._function_name),
      seq("alias", $._function_name, $._function_name),
      $.while_statement,
      $.until_statement,
      $.if_statement,
      $.unless_statement,
      $.for_statement,
      $.begin_statement,
      $.return_statement,
      $.case_statement,
      $.if_modifier,
      $.unless_modifier,
      $.while_modifier,
      $.until_modifier,
      $._expression
    ),

    _declaration: $ => choice(
      $.method_declaration,
      $.class_declaration,
      $.module_declaration
    ),

    method_declaration: $ => seq(
      "def", $._function_name, choice(seq("(", optional($.formal_parameters), ")"), seq(optional($.formal_parameters), $._terminator)),
      sep($._statement, $._terminator),
      "end"
    ),

    formal_parameters: $ => commaSep1(seq(optional(choice("*", "&")), $.identifier)),

    class_declaration: $ => seq("class", $.identifier, optional(seq("<", sep1($.identifier, "::"))), $._terminator, sep($._statement, $._terminator), "end"),

    module_declaration: $ => seq("module", $.identifier, $._terminator, sep($._statement, $._terminator), "end"),

    while_statement: $ => seq("while", $.condition, $._statement_block),
    until_statement: $ => seq("until", $.condition, $._statement_block),
    if_statement: $ => seq("if", $.condition, $._then_elsif_else_block),
    unless_statement: $ => seq("unless", $.condition, $._then_else_block),
    for_statement: $ => seq("for", $._lhs, "in", $._expression, $._statement_block),
    begin_statement: $ => seq(
      "begin",
      sep($._statement, $._terminator),
      repeat($.rescue_block),
      optional($.else_block),
      optional($.ensure_block),
      "end"
    ),

    return_statement: $ => seq("return", optional($._expression)),

    case_statement: $ => seq(
      "case", $._statement, $._line_break,
      repeat($.when_block),
      optional($.else_block),
      "end"
    ),
    when_block: $ => seq("when", $.pattern, $.then_block),

    pattern: $ => $._statement,

    if_modifier: $ => seq($._statement, "if", $._expression),
    unless_modifier: $ => seq($._statement, "unless", $._expression),
    while_modifier: $ => seq($._statement, "while", $._expression),
    until_modifier: $ => seq($._statement, "until", $._expression),

    condition: $ => $._expression,

    _statement_block: $ => choice(
      $._do_block,
      seq($._terminator, sep($._statement, $._terminator), "end")
    ),
    _do_block: $ => seq("do", sep($._statement, $._terminator), "end"),

    then_block: $ => seq(choice("then", $._terminator), sep($._statement, $._terminator)),
    else_block: $ => seq("else", sep($._statement, $._terminator)),
    rescue_block: $ => seq("rescue", commaSep($._primary), choice("do", $._terminator), sep($._statement, $._terminator)),
    ensure_block: $ => seq("ensure", sep($._statement, $._terminator)),

    _then_else_block: $ => seq($.then_block, optional($.else_block), "end"),
    _then_elsif_else_block: $ => seq(
      $.then_block,
      repeat(seq(
        "elsif", $.condition,
        $.then_block
      )),
      optional($.else_block),
      "end"
    ),

    function_call: $ => seq(
      $.member_access,
      $.argument_list
    ),

    argument_list: $ => choice(
      seq("(", commaSep($._expression), ")"),
      commaSep1($._expression)
    ),

    _expression: $ => choice(
      $._primary,
      $.yield,
      $.and,
      $.or,
      $.not,
      $.defined,
      $.assignment,
      $.conditional,
      $.range,
      $.boolean_or,
      $.boolean_and,
      $.relational,
      $.comparison,
      $.bitwise_or,
      $.bitwise_and,
      $.shift,
      $.additive,
      $.multiplicative,
      $.unary_minus,
      $.exponential,
      $.complement,
      $._literal
    ),

    _primary: $ => choice(
      seq("(", sep($._statement, $._terminator), ")"),
      $._lhs
    ),

    scope_resolution_expression: $ => seq(optional($._primary), '::', $.identifier),
    subscript_expression: $ => seq($._primary, "[", commaSep($._primary), "]"),
    member_access: $ => seq($._primary, ".", $.identifier),
    yield: $ => seq("yield", optional($._expression)),

    and: $ => prec.left(PREC.AND, seq($._expression, "and", $._expression)),
    or: $ => prec.left(PREC.OR, seq($._expression, "or", $._expression)),
    not: $ => prec.right(PREC.NOT, seq("not", $._expression)),
    defined: $ => prec(PREC.DEFINED, seq("defined?", $._expression)),
    assignment: $ => prec.right(PREC.ASSIGN, seq($._lhs, '=', $._expression)),
    conditional: $ => prec.right(PREC.CONDITIONAL, seq($._expression, '?', $._expression, ':', $._expression)),
    range: $ => prec.right(PREC.RANGE, seq($._expression, choice('..', '...'), $._expression)),

    boolean_or: $ => prec.left(PREC.BOOLEAN_OR, seq($._expression, '||', $._expression)),
    boolean_and: $ => prec.left(PREC.BOOLEAN_OR, seq($._expression, '&&', $._expression)),

    relational: $ => prec.right(PREC.RELATIONAL, seq($._expression, choice('==', '!=', '===', '<=>', '=~', '!~'), $._expression)),
    comparison: $ => prec.left(PREC.COMPARISON, seq($._expression, choice('<', '<=', '>', '>='), $._expression)),

    bitwise_or: $ => prec.left(PREC.BITWISE_OR, seq($._expression, choice('^', '|'), $._expression)),
    bitwise_and: $ => prec.left(PREC.BITWISE_AND, seq($._expression, '&', $._expression)),
    shift: $ => prec.left(PREC.SHIFT, seq($._expression, choice('<<', '>>'), $._expression)),

    additive: $ => prec.left(PREC.ADDITIVE, seq($._expression, choice('-', '+'), $._expression)),
    multiplicative: $ => prec.left(PREC.MULTIPLICATIVE, seq($._expression, choice('*', '/', '%'), $._expression)),

    unary_minus: $ => prec.right(PREC.UNARY_MINUS, seq('-', $._expression)),

    exponential: $ => prec.right(PREC.EXPONENTIAL, seq($._expression, '**', $._expression)),

    complement: $ => prec.right(PREC.COMPLEMENT, seq(choice('!', '~', '+'), $._expression)),

    _block_variable: $ => choice($._lhs, $._mlhs),
    _mlhs: $ => choice(
      seq(commaSep1($._mlhs_item), optional(seq("*", optional($._lhs)))),
      seq("*", optional($._lhs))
    ),
    _mlhs_item: $ => choice($._lhs, seq("(", $._mlhs, ")")),
    _lhs: $ => choice(
      $._variable,
      $.scope_resolution_expression,
      $.subscript_expression,
      $.member_access
    ),
    _variable: $ => choice($.identifier , 'self'),

    identifier: $ => token(seq(repeat(choice('@', '$')), identifierPattern)),

    comment: $ => token(choice(
      seq('#', /.*/),
      seq(
        '=begin\n',
        repeat(/.*\n/),
        '=end\n'
      )
    )),

    _literal: $ => choice(
      $.symbol,
      $.integer,
      $.float,
      $.boolean,
      $.nil,
      $.string,
      $.subshell,
      $.array,
      $.hash,
      $.regex,
      $.function
    ),

    symbol: $ => choice(
      token(seq(':', choice(identifierPattern, choice.apply(null, operators)))),
      seq(":'", $._single_quoted_continuation),
      seq(':"', $._double_quoted_continuation),
      seq('%s', choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d))),
        $._uninterpolated_angle,
        $._uninterpolated_bracket,
        $._uninterpolated_paren,
        $._uninterpolated_brace
      ))
    ),

    integer: $ => (/0b[01](_?[01])*|0[oO]?[0-7](_?[0-7])*|(0d)?\d(_?\d)*|0x[0-9a-fA-F](_?[0-9a-fA-F])*/),
    float: $ => (/\d(_?\d)*\.\d(_?\d)*([eE]\d(_?\d)*)?/),
    boolean: $ => choice('true', 'false', 'TRUE', 'FALSE'),
    nil: $ => choice('nil', 'NIL'),

    string: $ => seq(choice(
      $._quoted_string,
      seq(/%Q?/, choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d, $.interpolation))),
        $._interpolated_angle,
        $._interpolated_bracket,
        $._interpolated_paren,
        $._interpolated_brace
      )),
      seq(/%q/, choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d))),
        $._uninterpolated_angle,
        $._uninterpolated_bracket,
        $._uninterpolated_paren,
        $._uninterpolated_brace
      ))
    ), repeat($._quoted_string)),

    _quoted_string: $ => choice(
      seq("'", $._single_quoted_continuation),
      seq('"', $._double_quoted_continuation)
    ),
    _single_quoted_continuation: $ => stringBody(blank(), "'"),
    _double_quoted_continuation: $ => stringBody(blank(), '"', $.interpolation),

    _interpolated_angle: $ => balancedStringBody($._interpolated_angle, '<', '>', $.interpolation),
    _interpolated_bracket: $ => balancedStringBody($._interpolated_bracket, '[', ']', $.interpolation),
    _interpolated_paren: $ => balancedStringBody($._interpolated_paren, '(', ')', $.interpolation),
    _interpolated_brace: $ => balancedStringBody($._interpolated_brace, '{', '}', $.interpolation),
    _uninterpolated_angle: $ => balancedStringBody($._uninterpolated_angle, '<', '>'),
    _uninterpolated_bracket: $ => balancedStringBody($._uninterpolated_bracket, '[', ']'),
    _uninterpolated_paren: $ => balancedStringBody($._uninterpolated_paren, '(', ')'),
    _uninterpolated_brace: $ => balancedStringBody($._uninterpolated_brace, '{', '}'),
    interpolation: $ => seq(token(prec(PREC.LITERAL, '#{')), $._expression, '}'),

    subshell: $ => choice(
      stringBody('`', '`'),
      seq('%x', choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d, $.interpolation))),
        $._interpolated_angle,
        $._interpolated_bracket,
        $._interpolated_paren,
        $._interpolated_brace
      ))
    ),

    array: $ => choice(
      seq('[', $._array_items, ']'),
      seq(/%[wi]/, choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d))),
        $._uninterpolated_angle,
        $._uninterpolated_bracket,
        $._uninterpolated_paren,
        $._uninterpolated_brace
      )),
      seq(/%[WI]/, choice(
        choice.apply(null, unbalancedDelimiters.map(d => stringBody(d, d, $.interpolation))),
        $._interpolated_angle,
        $._interpolated_bracket,
        $._interpolated_paren,
        $._interpolated_brace
      ))
    ),

    _array_items: $ => optional(seq($._expression, optional(seq(',', $._array_items)))),

    hash: $ => seq('{', $._hash_items, '}'),
    _hash_items: $ => optional(seq($.pair, optional(seq(',', $._hash_items)))),

    pair: $ => seq(choice(
      seq($._expression, '=>'),
      seq($.identifier, ':')
    ), $._expression),

    regex: $ => prec(PREC.LITERAL, choice(
      regexBody('/', '/', $.interpolation),
      seq('%r', choice(
        choice.apply(null, unbalancedDelimiters.map(d => regexBody(d, d, $.interpolation))),
        $._regex_interpolated_angle,
        $._regex_interpolated_bracket,
        $._regex_interpolated_paren,
        $._regex_interpolated_brace
      ))
    )),

    _regex_interpolated_angle: $ => regexBody('<', '>', $.interpolation, $._regex_interpolated_angle),
    _regex_interpolated_bracket: $ => regexBody('[', ']', $.interpolation, $._regex_interpolated_bracket),
    _regex_interpolated_paren: $ => regexBody('(', ')', $.interpolation, $._regex_interpolated_paren),
    _regex_interpolated_brace: $ => regexBody('{', '}', $.interpolation, $._regex_interpolated_brace),

    function: $ => seq('->', optional(choice(seq('(', optional($.formal_parameters), ')'), $.identifier)), '{', sep($._statement, $._terminator), '}'),

    _function_name: $ => choice($.identifier, choice.apply(null, operators)),

    _line_break: $ => '\n',
    _terminator: $ => choice($._line_break, ';'),
  }
});

/// Describes the body of a string literal bounded by `open` and `close`, and optionally containing (potentially recursive) references to `insert`.
function stringBody (open, close, insert) {
  var contents = [ /\\./, RegExp('[^\\\\\\' + close + ']') ];
  if (typeof insert !== 'undefined') contents.push(insert);
  return seq(
    (typeof open === 'string') ? token(prec(PREC.LITERAL, open)) : open,
    repeat(choice.apply(null, contents)),
    token(prec(PREC.LITERAL, close))
  );
}

function balancedStringBody (me, open, close, insert) {
  var contents = [ /\\./, me, RegExp('[^\\\\\\' + open + '\\' + close + ']') ];
  if (typeof insert !== 'undefined') contents.push(insert);
  return seq(open, repeat(choice.apply(null, contents)), close);
}

function regexBody (open, close, interpolation, me) {
  var contents = [
    RegExp('\\[[^\\]\\n]*\\]|\\\\.|[^\\' + close + '\\\\\\[\\n]'),
    interpolation
  ];
  if (typeof me !== 'undefined') contents.push(me);
  return seq(
    (typeof open === 'string') ? token(prec(PREC.LITERAL, open)) : open,
    repeat(choice.apply(null, contents)),
    token(prec(PREC.LITERAL, RegExp('\\' + close + '[a-z]*')))
  );
}

function sep1 (rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function sep (rule, separator) {
  return optional(sep1(rule, separator));
}

function commaSep1 (rule) {
  return sep1(rule, ',')
}

function commaSep (rule) {
  return optional(commaSep1(rule));
}
