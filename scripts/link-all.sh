#!/bin/bash
cd packages
cd enhancer-bookmarks && yarn link
cd .. && cd enhancer-highlights && yarn link
cd .. && cd enhancer-search && yarn link
cd .. && cd react && yarn link
cd .. && cd reader && yarn link
cd .. && cd reader-enhancer-scripts && yarn link
cd .. && cd shared && yarn link
cd .. && cd streamer && yarn link