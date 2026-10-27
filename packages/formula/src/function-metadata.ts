export interface FunctionDoc {
  name: string;
  category: 'Math' | 'Statistical' | 'Logic' | 'Text' | 'Date & Time' | 'Lookup & Reference' | 'Financial' | 'Array' | 'Information';
  syntax: string;
  description: string;
  example: string;
}

export const functionDocs: Record<string, FunctionDoc> = {
  // --- Math ---
  SUM: {
    name: 'SUM',
    category: 'Math',
    syntax: 'SUM(number1, [number2], ...)',
    description: 'Adds all the numbers in a range of cells.',
    example: '=SUM(A1:A10)'
  },
  ABS: {
    name: 'ABS',
    category: 'Math',
    syntax: 'ABS(number)',
    description: 'Returns the absolute value of a number.',
    example: '=ABS(-42)'
  },
  ROUND: {
    name: 'ROUND',
    category: 'Math',
    syntax: 'ROUND(number, num_digits)',
    description: 'Rounds a number to a specified number of digits.',
    example: '=ROUND(3.14159, 2)'
  },
  ROUNDUP: {
    name: 'ROUNDUP',
    category: 'Math',
    syntax: 'ROUNDUP(number, num_digits)',
    description: 'Rounds a number up, away from 0.',
    example: '=ROUNDUP(3.14159, 2)'
  },
  ROUNDDOWN: {
    name: 'ROUNDDOWN',
    category: 'Math',
    syntax: 'ROUNDDOWN(number, num_digits)',
    description: 'Rounds a number down, toward 0.',
    example: '=ROUNDDOWN(3.14159, 2)'
  },
  INT: {
    name: 'INT',
    category: 'Math',
    syntax: 'INT(number)',
    description: 'Rounds a number down to the nearest integer.',
    example: '=INT(8.9)'
  },
  MOD: {
    name: 'MOD',
    category: 'Math',
    syntax: 'MOD(number, divisor)',
    description: 'Returns the remainder after number is divided by divisor.',
    example: '=MOD(10, 3)'
  },
  POWER: {
    name: 'POWER',
    category: 'Math',
    syntax: 'POWER(number, power)',
    description: 'Returns the result of a number raised to a power.',
    example: '=POWER(2, 8)'
  },
  SQRT: {
    name: 'SQRT',
    category: 'Math',
    syntax: 'SQRT(number)',
    description: 'Returns a positive square root.',
    example: '=SQRT(144)'
  },
  PRODUCT: {
    name: 'PRODUCT',
    category: 'Math',
    syntax: 'PRODUCT(number1, [number2], ...)',
    description: 'Multiplies all the numbers given as arguments.',
    example: '=PRODUCT(A1:A5)'
  },
  SIGN: {
    name: 'SIGN',
    category: 'Math',
    syntax: 'SIGN(number)',
    description: 'Returns the sign of a number (1 for positive, 0 for zero, -1 for negative).',
    example: '=SIGN(-15)'
  },
  CEILING: {
    name: 'CEILING',
    category: 'Math',
    syntax: 'CEILING(number, significance)',
    description: 'Rounds a number up to the nearest multiple of significance.',
    example: '=CEILING(4.3, 1)'
  },
  FLOOR: {
    name: 'FLOOR',
    category: 'Math',
    syntax: 'FLOOR(number, significance)',
    description: 'Rounds a number down to the nearest multiple of significance.',
    example: '=FLOOR(4.7, 1)'
  },
  TRUNC: {
    name: 'TRUNC',
    category: 'Math',
    syntax: 'TRUNC(number, [num_digits])',
    description: 'Truncates a number to an integer by removing the fractional part.',
    example: '=TRUNC(8.9)'
  },
  PI: {
    name: 'PI',
    category: 'Math',
    syntax: 'PI()',
    description: 'Returns the value of Pi (3.14159265358979).',
    example: '=PI()'
  },
  RAND: {
    name: 'RAND',
    category: 'Math',
    syntax: 'RAND()',
    description: 'Returns a random number between 0 and 1.',
    example: '=RAND()'
  },
  RANDBETWEEN: {
    name: 'RANDBETWEEN',
    category: 'Math',
    syntax: 'RANDBETWEEN(bottom, top)',
    description: 'Returns a random integer between the numbers you specify.',
    example: '=RANDBETWEEN(1, 100)'
  },
  EXP: {
    name: 'EXP',
    category: 'Math',
    syntax: 'EXP(number)',
    description: 'Returns e raised to the power of number.',
    example: '=EXP(1)'
  },
  LN: {
    name: 'LN',
    category: 'Math',
    syntax: 'LN(number)',
    description: 'Returns the natural logarithm of a number.',
    example: '=LN(10)'
  },
  LOG10: {
    name: 'LOG10',
    category: 'Math',
    syntax: 'LOG10(number)',
    description: 'Returns the base-10 logarithm of a number.',
    example: '=LOG10(100)'
  },
  LOG: {
    name: 'LOG',
    category: 'Math',
    syntax: 'LOG(number, [base])',
    description: 'Returns the logarithm of a number to a specified base.',
    example: '=LOG(8, 2)'
  },

  // --- Statistical ---
  AVERAGE: {
    name: 'AVERAGE',
    category: 'Statistical',
    syntax: 'AVERAGE(number1, [number2], ...)',
    description: 'Returns the average (arithmetic mean) of the arguments.',
    example: '=AVERAGE(A1:A10)'
  },
  MIN: {
    name: 'MIN',
    category: 'Statistical',
    syntax: 'MIN(number1, [number2], ...)',
    description: 'Returns the smallest number in a set of values.',
    example: '=MIN(A1:A10)'
  },
  MAX: {
    name: 'MAX',
    category: 'Statistical',
    syntax: 'MAX(number1, [number2], ...)',
    description: 'Returns the largest number in a set of values.',
    example: '=MAX(A1:A10)'
  },
  COUNT: {
    name: 'COUNT',
    category: 'Statistical',
    syntax: 'COUNT(value1, [value2], ...)',
    description: 'Counts how many numbers are in the list of arguments.',
    example: '=COUNT(A1:A10)'
  },
  COUNTA: {
    name: 'COUNTA',
    category: 'Statistical',
    syntax: 'COUNTA(value1, [value2], ...)',
    description: 'Counts the number of cells that are not empty in a range.',
    example: '=COUNTA(A1:A10)'
  },
  COUNTBLANK: {
    name: 'COUNTBLANK',
    category: 'Statistical',
    syntax: 'COUNTBLANK(range)',
    description: 'Counts empty cells in a specified range of cells.',
    example: '=COUNTBLANK(A1:A10)'
  },
  COUNTIF: {
    name: 'COUNTIF',
    category: 'Statistical',
    syntax: 'COUNTIF(range, criteria)',
    description: 'Counts the number of cells within a range that meet the given condition.',
    example: '=COUNTIF(A1:A10, ">50")'
  },
  COUNTIFS: {
    name: 'COUNTIFS',
    category: 'Statistical',
    syntax: 'COUNTIFS(criteria_range1, criteria1, ...)',
    description: 'Counts the number of cells specified by a given set of conditions or criteria.',
    example: '=COUNTIFS(A1:A10, ">50", B1:B10, "Approved")'
  },
  SUMIF: {
    name: 'SUMIF',
    category: 'Statistical',
    syntax: 'SUMIF(range, criteria, [sum_range])',
    description: 'Adds the cells specified by a given condition or criteria.',
    example: '=SUMIF(A1:A10, ">50", B1:B10)'
  },
  SUMIFS: {
    name: 'SUMIFS',
    category: 'Statistical',
    syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, ...)',
    description: 'Adds the cells in a range that meet multiple criteria.',
    example: '=SUMIFS(B1:B10, A1:A10, ">50", C1:C10, "Yes")'
  },
  AVERAGEIF: {
    name: 'AVERAGEIF',
    category: 'Statistical',
    syntax: 'AVERAGEIF(range, criteria, [average_range])',
    description: 'Returns the average of cells that meet a given condition.',
    example: '=AVERAGEIF(A1:A10, ">0")'
  },
  MEDIAN: {
    name: 'MEDIAN',
    category: 'Statistical',
    syntax: 'MEDIAN(number1, [number2], ...)',
    description: 'Returns the median of the given numbers.',
    example: '=MEDIAN(A1:A10)'
  },
  LARGE: {
    name: 'LARGE',
    category: 'Statistical',
    syntax: 'LARGE(array, k)',
    description: 'Returns the k-th largest value in a data set.',
    example: '=LARGE(A1:A10, 2)'
  },
  SMALL: {
    name: 'SMALL',
    category: 'Statistical',
    syntax: 'SMALL(array, k)',
    description: 'Returns the k-th smallest value in a data set.',
    example: '=SMALL(A1:A10, 1)'
  },

  // --- Logic ---
  IF: {
    name: 'IF',
    category: 'Logic',
    syntax: 'IF(logical_test, value_if_true, [value_if_false])',
    description: 'Specifies a logical test to perform.',
    example: '=IF(A1>10, "High", "Low")'
  },
  IFERROR: {
    name: 'IFERROR',
    category: 'Logic',
    syntax: 'IFERROR(value, value_if_error)',
    description: 'Returns a value you specify if a formula evaluates to an error; otherwise returns the result of the formula.',
    example: '=IFERROR(A1/B1, 0)'
  },
  IFNA: {
    name: 'IFNA',
    category: 'Logic',
    syntax: 'IFNA(value, value_if_na)',
    description: 'Returns the value you specify if the expression resolves to #N/A, otherwise returns the result of the expression.',
    example: '=IFNA(VLOOKUP(A1, D1:E10, 2, FALSE), "Not Found")'
  },
  AND: {
    name: 'AND',
    category: 'Logic',
    syntax: 'AND(logical1, [logical2], ...)',
    description: 'Returns TRUE if all of its arguments are TRUE.',
    example: '=AND(A1>0, B1>0)'
  },
  OR: {
    name: 'OR',
    category: 'Logic',
    syntax: 'OR(logical1, [logical2], ...)',
    description: 'Returns TRUE if any argument is TRUE.',
    example: '=OR(A1>100, B1>100)'
  },
  NOT: {
    name: 'NOT',
    category: 'Logic',
    syntax: 'NOT(logical)',
    description: 'Reverses the logic of its argument.',
    example: '=NOT(A1=B1)'
  },
  XOR: {
    name: 'XOR',
    category: 'Logic',
    syntax: 'XOR(logical1, [logical2], ...)',
    description: 'Returns a logical exclusive OR of all arguments.',
    example: '=XOR(A1>0, B1>0)'
  },
  SWITCH: {
    name: 'SWITCH',
    category: 'Logic',
    syntax: 'SWITCH(expression, val1, result1, [val2, result2], ... [default])',
    description: 'Evaluates an expression against a list of values and returns the result corresponding to the first matching value.',
    example: '=SWITCH(A1, 1, "Sunday", 2, "Monday", "Other")'
  },

  // --- Text ---
  CONCAT: {
    name: 'CONCAT',
    category: 'Text',
    syntax: 'CONCAT(text1, [text2], ...)',
    description: 'Combines the text from multiple ranges and/or strings.',
    example: '=CONCAT(A1, " ", B1)'
  },
  CONCATENATE: {
    name: 'CONCATENATE',
    category: 'Text',
    syntax: 'CONCATENATE(text1, [text2], ...)',
    description: 'Joins two or more text strings into one string.',
    example: '=CONCATENATE(A1, B1)'
  },
  LEFT: {
    name: 'LEFT',
    category: 'Text',
    syntax: 'LEFT(text, [num_chars])',
    description: 'Returns the first character or characters in a text string.',
    example: '=LEFT("GridForge", 4)'
  },
  RIGHT: {
    name: 'RIGHT',
    category: 'Text',
    syntax: 'RIGHT(text, [num_chars])',
    description: 'Returns the last character or characters in a text string.',
    example: '=RIGHT("GridForge", 5)'
  },
  MID: {
    name: 'MID',
    category: 'Text',
    syntax: 'MID(text, start_num, num_chars)',
    description: 'Returns a specific number of characters from a text string starting at the position you specify.',
    example: '=MID("GridForge", 5, 5)'
  },
  LEN: {
    name: 'LEN',
    category: 'Text',
    syntax: 'LEN(text)',
    description: 'Returns the number of characters in a text string.',
    example: '=LEN(A1)'
  },
  TRIM: {
    name: 'TRIM',
    category: 'Text',
    syntax: 'TRIM(text)',
    description: 'Removes spaces from text except for single spaces between words.',
    example: '=TRIM("   hello   world  ")'
  },
  UPPER: {
    name: 'UPPER',
    category: 'Text',
    syntax: 'UPPER(text)',
    description: 'Converts text to uppercase.',
    example: '=UPPER("gridforge")'
  },
  LOWER: {
    name: 'LOWER',
    category: 'Text',
    syntax: 'LOWER(text)',
    description: 'Converts text to lowercase.',
    example: '=LOWER("GRIDFORGE")'
  },
  PROPER: {
    name: 'PROPER',
    category: 'Text',
    syntax: 'PROPER(text)',
    description: 'Capitalizes the first letter in each word of a text value.',
    example: '=PROPER("apple macbook pro")'
  },
  SUBSTITUTE: {
    name: 'SUBSTITUTE',
    category: 'Text',
    syntax: 'SUBSTITUTE(text, old_text, new_text, [instance_num])',
    description: 'Substitutes new text for old text in a text string.',
    example: '=SUBSTITUTE("Item 1", "1", "2")'
  },
  REPLACE: {
    name: 'REPLACE',
    category: 'Text',
    syntax: 'REPLACE(old_text, start_num, num_chars, new_text)',
    description: 'Replaces characters within text.',
    example: '=REPLACE("XYZ123", 1, 3, "ABC")'
  },
  TEXTJOIN: {
    name: 'TEXTJOIN',
    category: 'Text',
    syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)',
    description: 'Combines the text from multiple ranges and/or strings with a delimiter.',
    example: '=TEXTJOIN(", ", TRUE, A1:A5)'
  },
  EXACT: {
    name: 'EXACT',
    category: 'Text',
    syntax: 'EXACT(text1, text2)',
    description: 'Checks whether two text values are identical (case-sensitive).',
    example: '=EXACT(A1, B1)'
  },
  REPT: {
    name: 'REPT',
    category: 'Text',
    syntax: 'REPT(text, number_times)',
    description: 'Repeats text a given number of times.',
    example: '=REPT("*", 10)'
  },
  FIND: {
    name: 'FIND',
    category: 'Text',
    syntax: 'FIND(find_text, within_text, [start_num])',
    description: 'Finds one text value within another (case-sensitive).',
    example: '=FIND("F", "GridForge")'
  },
  SEARCH: {
    name: 'SEARCH',
    category: 'Text',
    syntax: 'SEARCH(find_text, within_text, [start_num])',
    description: 'Finds one text value within another (not case-sensitive).',
    example: '=SEARCH("forge", "GridForge")'
  },
  CHAR: {
    name: 'CHAR',
    category: 'Text',
    syntax: 'CHAR(number)',
    description: 'Returns the character specified by the code number.',
    example: '=CHAR(65)'
  },
  CODE: {
    name: 'CODE',
    category: 'Text',
    syntax: 'CODE(text)',
    description: 'Returns a numeric code for the first character in a text string.',
    example: '=CODE("A")'
  },

  // --- Date & Time ---
  DATE: {
    name: 'DATE',
    category: 'Date & Time',
    syntax: 'DATE(year, month, day)',
    description: 'Returns the sequential serial number that represents a particular date.',
    example: '=DATE(2026, 10, 26)'
  },
  YEAR: {
    name: 'YEAR',
    category: 'Date & Time',
    syntax: 'YEAR(serial_number)',
    description: 'Returns the year corresponding to a date.',
    example: '=YEAR(TODAY())'
  },
  MONTH: {
    name: 'MONTH',
    category: 'Date & Time',
    syntax: 'MONTH(serial_number)',
    description: 'Returns the month of a date represented by a serial number.',
    example: '=MONTH(TODAY())'
  },
  DAY: {
    name: 'DAY',
    category: 'Date & Time',
    syntax: 'DAY(serial_number)',
    description: 'Returns the day of the month, a number from 1 to 31.',
    example: '=DAY(TODAY())'
  },
  TODAY: {
    name: 'TODAY',
    category: 'Date & Time',
    syntax: 'TODAY()',
    description: 'Returns the current date.',
    example: '=TODAY()'
  },
  NOW: {
    name: 'NOW',
    category: 'Date & Time',
    syntax: 'NOW()',
    description: 'Returns the current date and time.',
    example: '=NOW()'
  },
  EDATE: {
    name: 'EDATE',
    category: 'Date & Time',
    syntax: 'EDATE(start_date, months)',
    description: 'Returns the serial number of the date that is the indicated number of months before or after the start date.',
    example: '=EDATE(TODAY(), 3)'
  },
  EOMONTH: {
    name: 'EOMONTH',
    category: 'Date & Time',
    syntax: 'EOMONTH(start_date, months)',
    description: 'Returns the serial number of the last day of the month before or after a specified number of months.',
    example: '=EOMONTH(TODAY(), 0)'
  },
  NETWORKDAYS: {
    name: 'NETWORKDAYS',
    category: 'Date & Time',
    syntax: 'NETWORKDAYS(start_date, end_date, [holidays])',
    description: 'Returns the number of whole workdays between two dates.',
    example: '=NETWORKDAYS(A1, B1)'
  },
  WEEKDAY: {
    name: 'WEEKDAY',
    category: 'Date & Time',
    syntax: 'WEEKDAY(serial_number, [return_type])',
    description: 'Returns the day of the week corresponding to a date (1 for Sunday to 7 for Saturday by default).',
    example: '=WEEKDAY(TODAY())'
  },

  // --- Lookup & Reference ---
  VLOOKUP: {
    name: 'VLOOKUP',
    category: 'Lookup & Reference',
    syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
    description: 'Looks for a value in the leftmost column of a table, and then returns a value in the same row from a column you specify.',
    example: '=VLOOKUP("SKU-123", A1:D100, 3, FALSE)'
  },
  HLOOKUP: {
    name: 'HLOOKUP',
    category: 'Lookup & Reference',
    syntax: 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])',
    description: 'Looks for a value in the top row of a table, and returns a value in the same column from a row you specify.',
    example: '=HLOOKUP("Q1", A1:Z5, 2, FALSE)'
  },
  XLOOKUP: {
    name: 'XLOOKUP',
    category: 'Lookup & Reference',
    syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode])',
    description: 'Searches a range or an array, and returns an item corresponding to the first match it finds.',
    example: '=XLOOKUP(A1, B1:B10, C1:C10, "Not found")'
  },
  INDEX: {
    name: 'INDEX',
    category: 'Lookup & Reference',
    syntax: 'INDEX(array, row_num, [column_num])',
    description: 'Returns a value or reference of the cell at the intersection of a particular row and column, in a given range.',
    example: '=INDEX(A1:B10, 2, 1)'
  },
  MATCH: {
    name: 'MATCH',
    category: 'Lookup & Reference',
    syntax: 'MATCH(lookup_value, lookup_array, [match_type])',
    description: 'Returns the relative position of an item in an array that matches a specified value.',
    example: '=MATCH("Apple", A1:A10, 0)'
  },
  CHOOSE: {
    name: 'CHOOSE',
    category: 'Lookup & Reference',
    syntax: 'CHOOSE(index_num, value1, [value2], ...)',
    description: 'Uses index_num to return a value from the list of value arguments.',
    example: '=CHOOSE(2, "Gold", "Silver", "Bronze")'
  },
  OFFSET: {
    name: 'OFFSET',
    category: 'Lookup & Reference',
    syntax: 'OFFSET(reference, rows, cols, [height], [width])',
    description: 'Returns a reference to a range that is a specified number of rows and columns from a cell or range of cells.',
    example: '=OFFSET(A1, 2, 3)'
  },

  // --- Financial ---
  PMT: {
    name: 'PMT',
    category: 'Financial',
    syntax: 'PMT(rate, nper, pv, [fv], [type])',
    description: 'Calculates the payment for a loan based on constant payments and a constant interest rate.',
    example: '=PMT(0.05/12, 360, 200000)'
  },
  PV: {
    name: 'PV',
    category: 'Financial',
    syntax: 'PV(rate, nper, pmt, [fv], [type])',
    description: 'Returns the present value of an investment.',
    example: '=PV(0.08/12, 120, 500)'
  },
  FV: {
    name: 'FV',
    category: 'Financial',
    syntax: 'FV(rate, nper, pmt, [pv], [type])',
    description: 'Returns the future value of an investment based on periodic, constant payments and a constant interest rate.',
    example: '=FV(0.06/12, 12, -100)'
  },
  NPV: {
    name: 'NPV',
    category: 'Financial',
    syntax: 'NPV(rate, value1, [value2], ...)',
    description: 'Calculates the net present value of an investment by using a discount rate and a series of future payments.',
    example: '=NPV(0.1, A1:A5)'
  },
  IRR: {
    name: 'IRR',
    category: 'Financial',
    syntax: 'IRR(values, [guess])',
    description: 'Returns the internal rate of return for a series of cash flows.',
    example: '=IRR(A1:A5)'
  },

  // --- Array / Modern ---
  UNIQUE: {
    name: 'UNIQUE',
    category: 'Array',
    syntax: 'UNIQUE(array)',
    description: 'Returns a list of unique values in a list or range.',
    example: '=UNIQUE(A1:A10)'
  },
  SORT: {
    name: 'SORT',
    category: 'Array',
    syntax: 'SORT(array, [sort_index], [sort_order])',
    description: 'Sorts the contents of a range or array.',
    example: '=SORT(A1:A10, 1, 1)'
  },
  TRANSPOSE: {
    name: 'TRANSPOSE',
    category: 'Array',
    syntax: 'TRANSPOSE(array)',
    description: 'Returns a transposed range of cells.',
    example: '=TRANSPOSE(A1:C2)'
  },
  SEQUENCE: {
    name: 'SEQUENCE',
    category: 'Array',
    syntax: 'SEQUENCE(rows, [columns], [start], [step])',
    description: 'Generates a list of sequential numbers in an array.',
    example: '=SEQUENCE(10, 1, 1, 1)'
  },

  // --- Information ---
  ISBLANK: {
    name: 'ISBLANK',
    category: 'Information',
    syntax: 'ISBLANK(value)',
    description: 'Returns TRUE if the value refers to an empty cell.',
    example: '=ISBLANK(A1)'
  },
  ISNUMBER: {
    name: 'ISNUMBER',
    category: 'Information',
    syntax: 'ISNUMBER(value)',
    description: 'Returns TRUE if the value is a number.',
    example: '=ISNUMBER(A1)'
  },
  ISTEXT: {
    name: 'ISTEXT',
    category: 'Information',
    syntax: 'ISTEXT(value)',
    description: 'Returns TRUE if the value is text.',
    example: '=ISTEXT(A1)'
  },
  ISERROR: {
    name: 'ISERROR',
    category: 'Information',
    syntax: 'ISERROR(value)',
    description: 'Returns TRUE if the value is any error value.',
    example: '=ISERROR(A1)'
  },
  ISNA: {
    name: 'ISNA',
    category: 'Information',
    syntax: 'ISNA(value)',
    description: 'Returns TRUE if the value is the #N/A error value.',
    example: '=ISNA(A1)'
  },
  ISLOGICAL: {
    name: 'ISLOGICAL',
    category: 'Information',
    syntax: 'ISLOGICAL(value)',
    description: 'Returns TRUE if the value is a logical value (TRUE or FALSE).',
    example: '=ISLOGICAL(A1)'
  },
  NA: {
    name: 'NA',
    category: 'Information',
    syntax: 'NA()',
    description: 'Returns the error value #N/A.',
    example: '=NA()'
  }
};
