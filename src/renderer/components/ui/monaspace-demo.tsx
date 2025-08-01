import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface MonaspaceDemoProps {
  className?: string;
}

export const MonaspaceDemo: React.FC<MonaspaceDemoProps> = ({ className }) => {
  const codeSamples = [
    {
      title: 'Monaspace Neon',
      fontFamily: "'Monaspace Neon', 'Consolas', 'Courier New', monospace",
      description: 'Default, most readable variant',
      code: `function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}`,
    },
    {
      title: 'Monaspace Argon',
      fontFamily: "'Monaspace Argon', 'Consolas', 'Courier New', monospace",
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
      fontFamily: "'Monaspace Krypton', 'Consolas', 'Courier New', monospace",
      description: 'Another alternative with unique styling',
      code: `// API Response Handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`);
  }
  return response.json();
}`,
    },
    {
      title: 'Monaspace Xenon',
      fontFamily: "'Monaspace Xenon', 'Consolas', 'Courier New', monospace",
      description: 'Additional variant with unique characteristics',
      code: `interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const config: ApiConfig = {
  baseUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};`,
    },
    {
      title: 'Monaspace Radon',
      fontFamily: "'Monaspace Radon', 'Consolas', 'Courier New', monospace",
      description: 'Fifth variant with distinct styling',
      code: `class DataProcessor {
  private cache = new Map<string, any>();
  
  async process<T>(key: string, data: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const result = await this.transform(data);
    this.cache.set(key, result);
    return result;
  }
}`,
    },
  ];

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-6">Monaspace Font Variants</h2>
      
      {/* Quick Comparison */}
      <div className="mb-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Quick Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {codeSamples.map((sample, index) => (
            <div key={index} className="text-center">
              <div className="text-xs font-medium mb-2">{sample.title}</div>
              <div 
                className="text-xs bg-background p-2 rounded border"
                style={{ fontFamily: sample.fontFamily }}
              >
                <div>abcdefghijklmnop</div>
                <div>ABCDEFGHIJKLMNOP</div>
                <div>0123456789</div>
                <div>!@#$%^&*()</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid gap-6">
        {codeSamples.map((sample, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{sample.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{sample.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                  Font: {sample.title}
                </span>
                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                  Size: 12px
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre
                className="text-xs bg-muted p-4 rounded-md overflow-x-auto"
                style={{ fontFamily: sample.fontFamily }}
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
