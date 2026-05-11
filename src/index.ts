import type { PluginLoadingContextType, PluginType } from "@simeonradivoev/gameflow-sdk";
import type Conf from "conf";

export default class ExamplePlugin implements PluginType
{
    async load (ctx: PluginLoadingContextType<Record<string, any>>)
    {
    }
}