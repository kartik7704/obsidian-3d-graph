# get the package json version
VERSION=$(node -p -e "require('./package.json').version")
# increate the version by 1 minor
NEW_VERSION=$(bun semver $VERSION -i patch)
echo "Current version: $VERSION"
echo "New version: $NEW_VERSION"

# change the package.json version using linux command without using sed
jq --arg version "$NEW_VERSION" '.version = $version' package.json >tmp.json && mv tmp.json package.json
echo "Changed package.json version to $NEW_VERSION"

bun run version
echo "Updated version of manifest using bun"

git add . && git commit -m "release: $NEW_VERSION"
git tag -a "$NEW_VERSION" -m "release: $NEW_VERSION"
echo "Created tag $NEW_VERSION"
git push origin "$NEW_VERSION"
echo "Pushed tag $NEW_VERSION to origin branch $NEW_VERSION"
git push
echo "Pushed to origin master branch"
