#!/bin/bash


echo "Keys to remove from pt-BR.json:"
echo "-------------------------------"
jq -r 'keys_unsorted[]' pt-BR.json | grep -vFxf <(jq -r 'keys_unsorted[]' en.json)
echo "-------------------------------"

echo -e "\n\n"

echo "Keys to add to pt-BR.json: "
echo "-------------------------------"
jq -r 'keys_unsorted[]' en.json | grep -vFxf <(jq -r 'keys_unsorted[]' pt-BR.json)
echo "-------------------------------"