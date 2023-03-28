import React from "react";
import { mustacheDiv } from "../../common/commonUtilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { commit_sha } from "../../common/commonConstants";

const default_banner: string = `About Pheweb`


declare let window: ConfigurationWindow;
interface Props {}

const { config } = window;

const About = () => {

  const banner: string = config?.userInterface?.about?.banner || default_banner;
  return <div>
    {mustacheDiv(banner, {})}
    <p>
      {commit_sha}
    </p>
  </div>
}

export default About;