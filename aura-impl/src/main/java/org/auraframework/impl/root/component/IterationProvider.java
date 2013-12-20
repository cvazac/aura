/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 */
package org.auraframework.impl.root.component;

import java.util.*;

import org.auraframework.Aura;
import org.auraframework.def.ComponentConfigProvider;
import org.auraframework.instance.*;
import org.auraframework.system.Annotations.Provider;

import org.auraframework.system.AuraContext;
import org.auraframework.throwable.quickfix.QuickFixException;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * guts of the iteration component. dynamically instantiates the components in
 * its body based on the attributes passed into it
 * 
 * 
 * @since 0.0.234
 */
@Provider
public class IterationProvider implements ComponentConfigProvider {
    @Override
    public ComponentConfig provide() throws QuickFixException {
        AuraContext context = Aura.getContextService().getCurrentContext();
        BaseComponent<?, ?> component = context.getCurrentComponent();
        ComponentConfig cc = new ComponentConfig();
        List<Component> components = new ArrayList<Component>();
        InstanceStack iStack = context.getInstanceStack();
        Map<String, Object> m = Maps.newHashMapWithExpectedSize(1);
        m.put("realbody", components);
        cc.setAttributes(m);

        AttributeSet atts = component.getAttributes();
        Iterable<?> value = (Iterable<?>)atts.getValue("items");
        if (value != null) {
            List<?> items = Lists.newArrayList(value);
            if (!items.isEmpty()) {
                String var = (String) atts.getValue("var");
                String indexVar = (String) atts.getValue("indexVar");

                int realstart = 0;
                int realend = items.size();
                
                ComponentDefRefArray body = (ComponentDefRefArray) atts.getValue("body");
                Integer start = getIntValue(atts.getValue("start"));
                Integer end = getIntValue(atts.getValue("end"));
                if (start == null && end == null) {
                    // int page = (Integer)atts.getValue("page");
                    // int pageSize = (Integer)atts.getValue("pageSize");
                } else {
                    if (start != null && start > realstart) {
                        realstart = start;
                    }
                    
                    if (end != null && end < realend) {
                        realend = end;
                    }
                }
                
                // boolean reverse = (Boolean)atts.getValue("reverse");
                iStack.setAttributeName("realbody");
                for (int i = realstart; i < realend; i++) {
                    iStack.setAttributeIndex(i);
                    iStack.pushInstance(component);
                    iStack.setAttributeName("body");
                    Map<String, Object> providers = new HashMap<String, Object>();
                    providers.put(var, items.get(i));
                    if (indexVar != null) {
                        providers.put(indexVar, i);
                    }
                    
                    // realbody ends up dirty, don't need it to be
                    components.addAll(body.newInstance(atts.getValueProvider(), providers));
                    iStack.clearAttributeName("body");
                    iStack.popInstance(component);
                    iStack.clearAttributeIndex(i);
                }
                iStack.clearAttributeName("realbody");
            }
        }
        
        return cc;
    }

    private Integer getIntValue(Object val) {
        if (val == null) {
            return null;
        }
        if (val instanceof String) {
            return (int) Double.parseDouble((String) val);
        }
        return ((Number) val).intValue();
    }
}
