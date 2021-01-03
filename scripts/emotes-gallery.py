#!/usr/bin/env python3
import json
import os
import html
import sys


emotes_registry_path = sys.argv[1]
with open(os.path.expanduser(emotes_registry_path)) as f:
    emote_registry = json.load(f)


print("<!DOCTYPE html>")
print('<html lang="ru"><head>')
print('<meta charset="UTF-8">')
print('<meta name="viewport" content="width=device-width, initial-scale=1.0">')

print(
    r"""<style>

* {
    box-sizing: border-box;
}

html,
body {
    height: 100%;
}

main {
    min-height: 100%;
}

main {
    --main-padding: 20px;
    --emote-block-padding: 16px;
    --emote-img-size: 128px;

    max-width: calc(var(--main-padding) * 2 + (var(--emote-block-padding) * 2 + var(--emote-img-size)) * 8);
    margin: 0 auto;
    padding: var(--main-padding);
}

body {
    font-family: 'Ubuntu', sans-serif;
    line-height: 1.375;
    color: #dcddde;

    background-color: #202225;
}

main {
    background-color: #36393f;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    color: #fff;
}

a {
    color: #00b0f4;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

.emotes-container {
    display: flex;
    flex-wrap: wrap;
}

.emote-block {
    padding: var(--emote-block-padding);
}

.emote-block > img,
.emote-block > span {
    width: var(--emote-img-size);
}

.emote-block > img {
    display: block;
    height: var(--emote-img-size);
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    object-fit: contain;
}

.emote-block > span {
    display: block;
    overflow-wrap: anywhere;
}

</style>"""
)

print("</head><body>")

print("<main>")


assert emote_registry["version"] == 1
all_emotes = [emote for emote in emote_registry["list"] if emote["safe"]]
emotes_per_guild = {}
guild_names = {}
for emote in all_emotes:
    emotes_per_guild.setdefault(emote["guild_id"], []).append(emote)
    guild_names[emote["guild_id"]] = emote["guild_name"]

print("<h1>CrossCode Cross-Server emote gallery</h1>")

for guild_id, guild_emotes in emotes_per_guild.items():
    print(
        '<h2 id="{}">{}</h2>'.format(
            html.escape(guild_id), html.escape(guild_names[guild_id])
        )
    )

    print('<div class="emotes-container">')
    for emote in guild_emotes:
        if emote["safe"]:
            print('<div class="emote-block">')
            print(
                '<img src="{}" alt="{}">'.format(
                    html.escape(
                        emote["url"],
                    ),
                    html.escape(emote["ref"]),
                )
            )
            print("<span>{}</span>".format(html.escape(emote["ref"])))
            print("</div>")
    print("</div>")


print("</main>")

print("</body></html>")
