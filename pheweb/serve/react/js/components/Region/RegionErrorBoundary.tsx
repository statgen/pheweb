import React, {Component, ErrorInfo} from 'react'

interface Props { children: React.ReactNode }

export class RegionErrorBoundary extends React.Component {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error : Error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error : Error, errorInfo : ErrorInfo) {
        console.error(error);
        console.error(errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Error</h1>;
        }
        return this.props.children;
    }
}