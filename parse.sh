#!/usr/bin/env fish

# Enhanced parser for Napoleon agent logs - shows ALL fields including deeply nested JSON
# Usage: cat logfile | parse.sh OR parse.sh < logfile

function parse_line --argument line
    echo $line | jq --tab '
        # First parse the main object and handle the content field specifically
        if (.content // empty) and (.content | type) == "string" and ((.content | startswith("{")) or (.content | startswith("["))) then
            (.content | fromjson) as $parsed_content |
            .content = $parsed_content
        else
            .
        end |
        
        # Now handle any other nested stringified JSON in content
        if (.content // empty) and (.content | type) == "object" then
            .content |= (
                with_entries(
                    if (.value // empty) and (.value | type) == "string" and ((.value | startswith("{")) or (.value | startswith("["))) then
                        .value |= (try fromjson catch .)
                    else
                        .
                    end
                )
            )
        else
            .
        end
    '
end

while read -l line
    if test -n "$line"
        parse_line "$line"
    end
end
