// Shared MM-DD birthday math for the people-list sort and the home-screen reminder banner
// (spec sections 5 and 10). Lower is sooner; no birthday sorts last.
export function daysUntilBirthday(birthday: string | undefined): number {
  if (!birthday) return Infinity;
  const [month, day] = birthday.split('-').map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next.getTime() < now.setHours(0, 0, 0, 0)) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return Math.round((next.getTime() - now.getTime()) / 86_400_000);
}
