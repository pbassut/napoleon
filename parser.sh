#!/usr/bin/env fish

# Usage: smart_pretty_json_log.fish path/to/log.log [output_file]

set logfile $argv[1]
set outputfile $argv[2]

if not test -f $logfile
    echo "Error: '$logfile' does not exist."
    exit 1
end

function parse_line --argument line
    set content_type (echo $line | jq -r 'try .content | fromjson | type' 2>/dev/null)

    if test "$status" -eq 0 -a "$content_type" = "object"
        # content is a stringified JSON object
        echo $line | jq -r '
            {
                timestamp,
                type,
                source,
                parsed_content: (.content | fromjson)
            }
        ' | jq .
    else
        # content is just a string
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

if test -n "$outputfile"
    echo "" > $outputfile
    for line in (cat $logfile)
        parse_line "$line" >> $outputfile
    end
    echo "✅ Output saved to $outputfile"
else
    for line in (cat $logfile)
        parse_line "$line"
    end
end
