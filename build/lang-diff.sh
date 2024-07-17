#!/bin/bash


echo "Keys to remove from ../packages/editor-ui/src/plugins/i18n/locales/pt-BR.json:"
echo "-------------------------------"
jq -r 'keys_unsorted[]' ../packages/editor-ui/src/plugins/i18n/locales/pt-BR.json | grep -vFxf <(jq -r 'keys_unsorted[]' ../packages/editor-ui/src/plugins/i18n/locales/en.json)
echo "-------------------------------"

echo -e "\n\n"

echo "Keys to add to ../packages/editor-ui/src/plugins/i18n/locales/pt-BR.json: "
echo "-------------------------------"
jq -r 'keys_unsorted[]' ../packages/editor-ui/src/plugins/i18n/locales/en.json | grep -vFxf <(jq -r 'keys_unsorted[]' ../packages/editor-ui/src/plugins/i18n/locales/pt-BR.json)
echo "-------------------------------"
