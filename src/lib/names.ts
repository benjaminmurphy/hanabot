const examplePlayerNames = [
  'John',
  'Jane',
  'Bob',
  'Alice',
  'Joe',
  'Mary',
  'Sally',
  'Tom',
  'Sue',
  'Bill',
  'Karen',
  'Mike',
  'Jill',
  'Jack',
  'Sarah',
  'David',
  'Megan',
  'Chris',
];

export const getPlayerNames = (count: number) => {
  const names = [...examplePlayerNames];
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * names.length);
    result.push(names[index]);
    names.splice(index, 1);
  }

  return result;
}