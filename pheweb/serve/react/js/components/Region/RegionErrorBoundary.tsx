import React, {Component, ErrorInfo} from 'react'
import ReactDOM from 'react-dom'

interface Props { children: React.ReactNode }

export class RegionErrorBoundary extends React.Component {
    state : { hasError : boolean };
    props : Props;

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

    errorMessage : React.ReactNode = <h1>Error</h1>

    render() : React.ReactNode | HTMLElement {
        if (this.state.hasError) {
            return this.errorMessage;
        }
        return this.props.children;
    }
}