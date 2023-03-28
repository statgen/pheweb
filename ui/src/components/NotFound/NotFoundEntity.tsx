import React from "react";
import { mustacheDiv } from "../../common/commonUtilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { NotFoundReferentType } from "./notFoundModel";

interface Props {
  location?: { search?: string };
  referentType?: NotFoundReferentType;
}
interface QueryResult {}

declare let window: ConfigurationWindow;

const default_message_template: string = `
      <p>
      {{#query}}Could not find page for <i>'<span className="query">{{.}}<span>'</i>{{/query}}
      {{^query}}An empty query was supplied;<br> therefore, a page could not be found.{{/query}}
      </p>
      `;

const NotFoundEntity =
  (referentType: NotFoundReferentType) =>
  ({ location }: Props) => {
    const { config } = window;
    const query =
      (location?.search &&
        new URLSearchParams(location?.search).get("query")) ||
      window.location.pathname;
    // NOTE: Empty value is set by backtick quotes and not mustache

    const message_template: string =
      (referentType &&
        config?.userInterface?.notFound?.[referentType]?.message) ||
      default_message_template;
    const parameters = { query };
    return (
      <React.Fragment>
        {mustacheDiv(message_template, parameters)}
      </React.Fragment>
    );
  };

export default NotFoundEntity;
