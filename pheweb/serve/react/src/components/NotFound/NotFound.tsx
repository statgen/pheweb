import { mustacheDiv } from "../../common/Utilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";

interface Props {
  location: { search: string };
}
interface QueryResult {}

declare let window: ConfigurationWindow;

const NotFound = (props: Props) => {
  const { config } = window;
  const query = new URLSearchParams(props.location.search).get("query") || window.location.pathname;
  // NOTE: Empty value is set by backtick quotes and not mustache

  const default_message_template: string = `
      <p>
      {{#query}}Could not find page for <i>'<span className="query">{{.}}<span>'</i>{{/query}}
      {{^query}}An empty query <i className="query">'${query}'</i> was supplied;<br> therefore, a page could not be found.{{/query}}
      </p>
      `;
  const message_template: string =
    config?.userInterface?.notFound?.message_template ||
    default_message_template;
  const parameters = { query };
  return mustacheDiv(message_template, parameters);
};

export default NotFound;
