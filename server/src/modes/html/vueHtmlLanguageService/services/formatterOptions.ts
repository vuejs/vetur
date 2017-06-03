const defaultHtmlOptions = {
  brace_style: 'collapse', // [collapse|expand|end-expand|none] Put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are
  end_with_newline: false, // End output with newline
  indent_char: ' ', // Indentation character
  indent_handlebars: false, // e.g. {{#foo}}, {{/foo}}
  indent_inner_html: false, // Indent <head> and <body> sections
  indent_scripts: 'keep', // [keep|separate|normal]
  indent_size: 2, // Indentation size
  indent_with_tabs: false,
  max_preserve_newlines: 1, // Maximum number of line breaks to be preserved in one chunk (0 disables)
  preserve_newlines: true, // Whether existing line breaks before elements should be preserved (only works before elements, not inside tags or for text)
  unformatted: [], // List of tags that should not be reformatted
  wrap_line_length: 0, // Lines should wrap at next opportunity after this number of characters (0 disables)
  wrap_attributes: 'force-aligned' // Wrap attributes to new lines [auto|force|force-aligned|force-expand-multiline] ["auto"]
};

const defaultCssOptions = {
  end_with_newline: false, // End output with newline
  indent_char: ' ', // Indentation character
  indent_size: 2, // Indentation size
  indent_with_tabs: false,
  newline_between_rules: true, // Add a new line after every css rule
  preserve_newlines: true,
  selector_separator: ' ',
  selector_separator_newline: true // Separate selectors with newline or not (e.g. 'a,\nbr' or 'a, br')
};

export { defaultHtmlOptions, defaultCssOptions };