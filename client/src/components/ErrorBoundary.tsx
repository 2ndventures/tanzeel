import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-background p-6">
          <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-2xl max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-border via-border/50 to-border rounded-3xl" />
            <div className="relative bg-card/80 backdrop-blur-2xl p-8 rounded-3xl">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="size-16 rounded-full bg-destructive/20 flex items-center justify-center">
                    <svg
                      className="size-8 text-destructive"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Something went wrong
                  </h2>
                  <p className="text-muted-foreground">
                    We're sorry for the inconvenience. The app encountered an unexpected error.
                  </p>
                </div>

                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  size="lg"
                  data-testid="button-reload"
                >
                  Reload App
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
