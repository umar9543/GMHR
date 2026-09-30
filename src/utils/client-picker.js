// ----------------------------------------------------------------------
// Finding a client site by its code.
//
// A plain "contains" match is useless for codes: typing 1 returns 1, 10, 11,
// 100, 201, 431 and everything else with a 1 in it, and the site you wanted
// is somewhere in the middle. So a number is matched as a code - the exact
// one first, then the codes that start with it - and only then names. Words
// are matched on the name as before.
// ----------------------------------------------------------------------

const LIMIT = 50;

export function clientLabel(client) {
  if (!client) return '';
  const code = client.clientId ?? '';
  const name = client.name ?? '';
  if (code === '') return name;
  return name ? `${code} - ${name}` : String(code);
}

/**
 * The filter every client picker uses. `state.inputValue` is what was typed.
 */
export function filterClientOptions(options, state) {
  const query = String(state?.inputValue ?? '').trim().toLowerCase();
  if (!query) return options.slice(0, LIMIT);

  // A number means a code.
  if (/^\d+$/.test(query)) {
    const exact = [];
    const startsWith = [];
    const byName = [];

    options.forEach((option) => {
      const code = String(option.clientId ?? '');
      if (code === query) exact.push(option);
      else if (code.startsWith(query)) startsWith.push(option);
      else if (String(option.name ?? '').toLowerCase().includes(query)) byName.push(option);
    });

    return [...exact, ...startsWith, ...byName].slice(0, LIMIT);
  }

  return options
    .filter((option) =>
      `${option.clientId ?? ''} ${option.name ?? ''}`.toLowerCase().includes(query)
    )
    .slice(0, LIMIT);
}

export default filterClientOptions;
