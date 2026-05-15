import type { PluginLoadingContextType, PluginType } from "@simeonradivoev/gameflow-sdk";
import pgk from '../package.json';
import type { DownloadLookupDetails, DownloadLookupDetailsFile, DownloadLookupEntry, GameLookup } from "@simeonradivoev/gameflow-sdk/shared";

export default class ExamplePlugin implements PluginType
{
    fields = ['identifier', 'description', 'publicdate', 'title', 'month', 'week', 'item_size', 'date', 'avg_rating', 'downloads', 'num_reviews'];

    async load (ctx: PluginLoadingContextType<Record<string, any>>)
    {
        ctx.hooks.games.downloadLookup.tapPromise(pgk.name, async ({ source, id }) =>
        {
            if (source === pgk.name)
            {
                const response = await fetch(`https://archive.org/metadata/${id}`);
                if (!response.ok)
                {
                    console.error(response.statusText);
                    return;
                }

                const metadata: any = await response.json();
                const details: DownloadLookupDetails = {
                    source: pgk.name,
                    id: id,
                    cover_url: `https://archive.org/services/img/${id}`,
                    name: metadata.metadata.title ?? id,
                    summary: metadata.metadata.description,
                    date: new Date(metadata.metadata.date ?? metadata.metadata.publicdate),
                    files: metadata.files.map((f: any) =>
                    {
                        const file: DownloadLookupDetailsFile = {
                            id: f.name,
                            format: f.format,
                            size: Number(f.size),
                            mtime: f.mtime,
                            download_url: `https://archive.org/download/${id}/${encodeURIComponent(f.name)}`
                        };

                        return file;
                    })
                };

                return details;
            }
        });

        ctx.hooks.games.downloadsLookupFilters.tapPromise(pgk.name, async ({ filters }) =>
        {
            filters.source.push(pgk.name);
            filters.orderBy.push(...this.fields);
        });

        ctx.hooks.games.downloadsLookup.tapPromise(pgk.name, async (matches, { search, source, page, rows, orderBy, sortDirection }) =>
        {
            let url: string;

            if (!!source && source !== pgk.name)
            {
                return matches.set(pgk.name, { count: 0, items: [] });
            }

            if (search)
            {
                const query = encodeURIComponent(`mediatype:software AND ${search}`);
                const pageParam = page ?? 1;
                const rowsParam = rows ?? 20;
                const output = 'json';
                const fields = this.fields;
                const sortParam = orderBy ? `${`${orderBy}+${sortDirection ?? 'desc'}`}` : '';
                const fieldsQuery = fields.map(f => `&fl[]=${f}`).join("");
                url = `https://archive.org/advancedsearch.php?q=${query}${fieldsQuery}&rows=${rowsParam}&page=${pageParam}&output=${output}&sort[]=${sortParam}&sort[]=&sort[]=&save=yes`;


            } else
            {
                const query = encodeURIComponent(`mediatype:software AND collection:"emulation"`);
                const pageParam = page ?? 1;
                const rowsParam = rows ?? 20;
                const output = 'json';
                const fields = this.fields;
                const sortParam = orderBy ? `${`${orderBy}+${sortDirection ?? 'desc'}`}` : `week+desc`;
                const fieldsQuery = fields.map(f => `&fl[]=${f}`).join("");
                url = `https://archive.org/advancedsearch.php?q=${query}${fieldsQuery}&rows=${rowsParam}&page=${pageParam}&output=${output}&sort[]=${sortParam}&sort[]=&sort[]=&save=yes`;
            }

            const response = await fetch(url);

            if (!response.ok)
            {
                console.error(response.statusText);
                return matches.set(pgk.name, { count: 0, items: [] });
            }

            const result: any = await response.json();
            matches.set(pgk.name, ({
                count: result.response.numFound, items: result.response.docs.map((r: any) =>
                {
                    const lookup: DownloadLookupEntry = {
                        source: pgk.name,
                        id: r.identifier,
                        cover_url: `https://archive.org/services/img/${r.identifier}`,
                        name: r.title,
                        summary: r.description,
                        size: r.item_size,
                        date: new Date(r.date ?? r.publicdate),
                        rating: r.avg_rating,
                        view_count: r.month ?? r.week,
                        download_count: r.downloads,
                        comment_count: r.num_reviews
                    };

                    return lookup;
                })
            }));

            return matches;
        });


    }
}