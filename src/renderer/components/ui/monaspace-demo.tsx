import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface MonaspaceDemoProps {
  className?: string;
}

export const MonaspaceDemo: React.FC<MonaspaceDemoProps> = ({ className }) => {
  const codeSamples = [
    {
      title: 'Monaspace Neon',
      className: 'font-mono-neon',
      description: 'Default, most readable variant',
      code: `function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}`,
    },
    {
      title: 'Monaspace Argon',
      className: 'font-mono-argon',
      description: 'Alternative variant with different character shapes',
      code: `const user = {
  id: 12345,
  name: "John Doe",
  email: "john@example.com",
  preferences: {
    theme: "dark",
    notifications: true
  }
};`,
    },
    {
      title: 'Monaspace Krypton',
      className: 'font-mono-krypton',
      description: 'Another alternative with unique styling',
      code: `// API Response Handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`);
  }
  return response.json();
}`,
    },
  ];

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-6">Monaspace Font Variants</h2>
      <div className="grid gap-6">
        {codeSamples.map((sample, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{sample.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{sample.description}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <pre
                className={`${sample.className} text-xs bg-muted p-4 rounded-md overflow-x-auto`}
              >
                <code>{sample.code}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
