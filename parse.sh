#!/usr/bin/env fish

# Reads JSON log lines from stdin and pretty prints them smartly

function parse_line --argument line
    set content_type (echo $line | jq -r 'try .content | fromjson | type' 2>/dev/null)

    if test "$status" -eq 0 -a "$content_type" = "object"
        echo $line | jq -r '
            {
                timestamp,
                type,
                source,
                parsed_content: (.content | fromjson)
            }
        ' | jq .
    else
        echo $line | jq -r '
            {
                timestamp,
                type,
                source,
                content
            }
        ' | jq .
    end
end

while read -l line
    parse_line "$line"
end
