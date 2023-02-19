import React from "react";
import { mustacheDiv } from "../../common/Utilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { commit_sha } from "../../common/constants";

const default_banner: string = `About Pheweb`


declare let window: ConfigurationWindow;
interface Props {}

const { config } = window;

const About = (props : Props) => {

  const banner: string = config?.userInterface?.about?.banner || default_banner;
  return <div>
    {mustacheDiv(banner, {})}
    <p>
      {commit_sha}
    </p>
  </div>
}

export default About;