/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { withTranslation } from "react-i18next";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, info: null };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("Render error in subtree:", error, info);
    this.setState({ info });
  }
  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          {t("error_boundary.generic")}
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
