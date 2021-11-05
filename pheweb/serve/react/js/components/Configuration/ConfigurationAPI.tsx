import React from "react";
import {ConfigurationMetaData, ConfigurationUserInterface} from "./ConfigurationModel";
import {get} from "../../common/Utilities";
import {Region} from "../Region/RegionModel";
import {region_url} from "../Region/RegionAPI";

export const getConfigurationUserInterface = (setUserInterface: React.Dispatch<React.SetStateAction<ConfigurationUserInterface | undefined>>, getURL = get) => {
    return getURL<ConfigurationUserInterface>('/api/config/ui',setUserInterface);
}

export const getConfigurationMetaData = (setMetadata: React.Dispatch<React.SetStateAction<ConfigurationMetaData | undefined>>, getURL = get) => {
    return getURL<ConfigurationUserInterface>('/api/config/metadata',setMetadata);
}
