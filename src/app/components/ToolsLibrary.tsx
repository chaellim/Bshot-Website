import logo from '../../imports/burger-shot-logo.png';
import { useNavigate } from 'react-router-dom';

export interface Tool {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
}

const tools: Tool[] = [
  {
    id: 1,
    name: 'Sales Log',
    description: 'Record and track daily sales transactions',
    icon: '🍔',
    category: 'Sales'
  },
  {
    id: 2,
    name: 'Staff Scheduler',
    description: 'Schedule and manage staff shifts',
    icon: '👥',
    category: 'HR'
  },
  {
    id: 3,
    name: 'Schedule Request',
    description: 'Request and view your work schedule',
    icon: '📅',
    category: 'HR'
  },
  {
    id: 4,
    name: 'Financial Reports',
    description: 'Generate financial statements and reports',
    icon: '💰',
    category: 'Finance'
  },
  {
    id: 5,
    name: 'Sales Tracker Dashboard',
    description: 'View comprehensive sales analytics and metrics',
    icon: '📊',
    category: 'Analytics'
  }
];

interface ToolsLibraryProps {
  onLogout: () => void;
  userRole: 'trainee' | 'employee' | 'manager' | 'owner';
}

export default function ToolsLibrary({ onLogout, userRole }: ToolsLibraryProps) {
  const navigate = useNavigate();

  // Filter tools based on role
const availableTools = tools.filter(tool => {

  // trainee + employee → Sales Log, Schedule Request, and Sales Tracker Dashboard (view only)
  if (userRole === 'trainee' || userRole === 'employee') {
    return (
      tool.name === 'Sales Log' ||
      tool.name === 'Schedule Request' ||
      tool.name === 'Sales Tracker Dashboard'
    );
  }

  // manager → specific tools only
  if (userRole === 'manager') {
    return (
      tool.name === 'Sales Log' ||
      tool.name === 'Schedule Request' ||
      tool.name === 'Financial Reports' ||
      tool.name === 'Sales Tracker Dashboard'
    );
  }

  // owner → sees EVERYTHING except Schedule Request (they have Staff Scheduler)
  if (userRole === 'owner') {
    return tool.name !== 'Schedule Request';
  }

  return true;
});

  const handleNavigation = (toolName: string) => {
    if (toolName === 'Sales Log') {
      navigate('/sales-log');
    }

    if (toolName === 'Sales Tracker Dashboard') {
      navigate('/sales-dashboard');
    }

    if (toolName === 'Staff Scheduler') {
      navigate('/staff-scheduler');
    }

    if (toolName === 'Schedule Request') {
      navigate('/schedule-request');
    }
    // Other tools (optional for future)
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Burger Shot" className="h-12 w-auto" />
              <div>
                <h1 className="text-foreground">Management Portal</h1>
                <p className="text-xs text-muted-foreground capitalize">
                  Role: {userRole}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-foreground mb-2">Tools Library</h2>
          <p className="text-muted-foreground">
            Select a tool to get started with your restaurant management
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleNavigation(tool.name)}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all text-left group"
            >
              <div className="flex flex-col h-full">
                <div className="text-4xl mb-4">{tool.icon}</div>

                <h3 className="text-foreground mb-2 group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>

                <p className="text-muted-foreground mb-4 flex-grow">
                  {tool.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs px-3 py-1 bg-muted text-muted-foreground rounded-full">
                    {tool.category}
                  </span>

                  <svg
                    className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
