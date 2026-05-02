/* eslint-disable */
"use client";

/**
 * ErrorBoundary — Catches render errors and shows a beautiful error card
 * Wraps animation components and the app top-level
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  retryLabel?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-2xl shadow-red-500/10 p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {this.props.fallbackTitle || "Oops! Something went wrong"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {this.props.fallbackDescription || "The animation engine encountered an unexpected error."}
            </p>

            {/* Retry Button */}
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-lg shadow-blue-500/25 mb-4"
            >
              {this.props.retryLabel || "Try Again"}
            </button>

            {/* Error Details Toggle */}
            {this.state.error && (
              <div className="mt-4">
                <button
                  onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
                >
                  {this.state.showDetails ? "▲ Hide Details" : "▼ Show Details"}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-3 p-4 bg-slate-50 rounded-xl text-[11px] text-red-600 text-left overflow-auto max-h-40 border border-slate-100 font-mono">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
