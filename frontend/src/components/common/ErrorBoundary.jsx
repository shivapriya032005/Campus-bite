import { Component } from 'react';
import Button from './Button';

/**
 * Catches render errors and failed lazy-chunk loads (e.g. after a new deploy replaced the old
 * chunk files) so the user gets a recovery screen instead of a blank page.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isChunkError = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(
      String(this.state.error?.message || '')
    );
    return (
      <div role="alert" className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-white">
          {isChunkError ? 'A new version is available' : 'Something went wrong'}
        </h1>
        <p className="text-sm text-gray-400">
          {isChunkError
            ? 'CampusBite was updated while this page was open. Reload to continue.'
            : 'An unexpected error occurred while showing this page.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          {!isChunkError && (
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }
}
