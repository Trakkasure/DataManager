JS_TESTER = ./node_modules/vows/bin/vows
JS_COMPILER = uglifyjs

all: dataManager.min.js package.json

dataManager.js: \
		js/dataManager.js \
		js/crossfilter.js \
		js/dispatch.js \
		Makefile

%.min.js: %.js Makefile
		@rm -f $@
		$(JS_COMPILER) < $< > $@

%.js:
		@rm -f $@
		@echo '(function(exports){' > $@
		cat $(filter %.js,$^) >> $@
		@echo '})(this);' >> $@
		@chmod a-w $@

package.json: dataManager.js js/package.js
		@rm -f $@
		node js/package.js > $@
		@chmod a-w $@

clean:
		rm -f dataManager.min.js dataManager.js package.json

test: all
		@$(JS_TESTER)

benchmark: all
		@node test/benchmark.js
